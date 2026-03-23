import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db'
import { getUser, requireUser } from '@/lib/session'
import { sanitizeBody } from '@/lib/sanitize'

const PAGE_SIZE = 30

// GET /api/requests — лента с фильтрами + пагинация
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const type         = sp.get('type')         // duo | multiplayer
  const contentLevel = sp.get('content')      // none | rare | often | core
  const fandomType   = sp.get('fandom_type')  // fandom | original
  const pairing      = sp.get('pairing')      // sl | fm | gt | any
  const tags         = sp.get('tags')         // comma-separated
  const language     = sp.get('language')     // ru | en
  const q            = sp.get('q')            // text search
  const mine         = sp.get('mine')         // 'true'
  const page         = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)

  const user = await getUser()

  try {
    const conditions: string[] = ['r.is_public = true', "r.status = 'active'"]
    const params: unknown[]    = []
    let p = 1
    let joinClause = ''

    if (mine === 'true' && user) {
      conditions.length = 0
      conditions.push(`r.author_id = $${p++}`)
      params.push(user.id)
    } else {
      // Hide requests from banned users in public feed
      joinClause = 'JOIN users u ON u.id = r.author_id'
      conditions.push('u.banned_at IS NULL')
    }
    if (type)         { conditions.push(`r.type = $${p++}`);          params.push(type) }
    if (contentLevel) { conditions.push(`r.content_level = $${p++}`); params.push(contentLevel) }
    if (fandomType)   { conditions.push(`r.fandom_type = $${p++}`);   params.push(fandomType) }
    if (pairing)      { conditions.push(`r.pairing = $${p++}`);       params.push(pairing) }
    if (language)     { conditions.push(`r.language = $${p++}`);      params.push(language) }
    if (tags) {
      const tagArr = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      if (tagArr.length) {
        conditions.push(`r.tags && $${p++}`)
        params.push(tagArr)
      }
    }
    if (q && q.length <= 200) {
      conditions.push(`(r.title ILIKE $${p} OR r.body ILIKE $${p})`)
      params.push(`%${q}%`)
      p++
    }

    // Фильтр по чёрному списку тегов (только для авторизованных, не в режиме mine)
    if (user && mine !== 'true') {
      const blacklist = await query<{ tag: string }>(
        'SELECT tag FROM user_tag_blacklist WHERE user_id = $1',
        [user.id]
      )
      if (blacklist.length) {
        conditions.push(`NOT (r.tags && $${p++})`)
        params.push(blacklist.map(r => r.tag))
      }

      // Hide requests where user already participates in an active game (not author's own)
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM games g
        JOIN game_participants gp ON gp.game_id = g.id
        WHERE g.request_id = r.id
          AND gp.user_id = $${p++}
          AND gp.left_at IS NULL
          AND r.author_id != $${p++}
      )`)
      params.push(user.id, user.id)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM requests r ${joinClause} ${where}`,
      params
    )
    const total = parseInt(countResult?.count || '0', 10)
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const offset = (page - 1) * PAGE_SIZE

    const rows = await query(
      `SELECT r.id, r.title, r.body, r.type, r.content_level, r.fandom_type, r.pairing, r.language, r.tags, r.status, r.is_public, r.created_at, r.updated_at, r.author_id
       FROM requests r
       ${joinClause}
       ${where}
       ORDER BY COALESCE(r.updated_at, r.created_at) DESC
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, PAGE_SIZE, offset]
    )
    // Sanitize body on read to protect against stored XSS from old data
    const safeRows = (rows as { body?: string }[]).map(r => ({
      ...r,
      body: r.body ? sanitizeBody(r.body) : r.body,
    }))
    return NextResponse.json({ requests: safeRows, total, page, totalPages })
  } catch (error) {
    console.error('[API /api/requests] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// POST /api/requests — создать заявку
export async function POST(req: NextRequest) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }
  const { title, description, type, content_level, fandom_type, pairing, language, tags, is_public, status } = body

  if (!title || !type || !content_level) {
    return NextResponse.json({ error: 'fillRequired' }, { status: 400 })
  }
  if (title.length > 200) {
    return NextResponse.json({ error: 'titleTooLong' }, { status: 400 })
  }
  if (description && description.length > 200_000) {
    return NextResponse.json({ error: 'bodyTooLong' }, { status: 400 })
  }
  const tagsArr: string[] = (tags || []).map((t: string) => t.trim().toLowerCase()).filter(Boolean)
  if (tagsArr.length > 20 || tagsArr.some((t: string) => t.length > 50)) {
    return NextResponse.json({ error: 'tooManyTags' }, { status: 400 })
  }

  try {
    // Anti-spam checks apply only to published requests (status = 'active'), not drafts
    const isPublishing = status === 'active'

    if (isPublishing && process.env.NODE_ENV !== 'development') {
      // Anti-spam: rate limit (5 published requests/day, drafts unlimited)
      const recentCount = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM requests WHERE author_id = $1 AND status = 'active' AND created_at > NOW() - INTERVAL '1 day'`,
        [user.id]
      )
      if (recentCount && parseInt(recentCount.count) >= 5) {
        return NextResponse.json({ error: 'requestLimitReached' }, { status: 429 })
      }

      // Anti-spam: cooldown (3 minutes between published requests)
      const lastRequest = await queryOne<{ created_at: string }>(
        `SELECT created_at FROM requests WHERE author_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      )
      if (lastRequest) {
        const diff = Date.now() - new Date(lastRequest.created_at).getTime()
        if (diff < 3 * 60 * 1000) {
          return NextResponse.json({ error: 'requestCooldown' }, { status: 429 })
        }
      }

      // Anti-spam: fuzzy duplicate detection (similar title OR body in last 24h)
      const duplicate = await queryOne<{ id: string }>(
        `SELECT id FROM requests
         WHERE author_id = $1 AND created_at > NOW() - INTERVAL '1 day'
         AND (
           similarity(LOWER(title), LOWER($2)) > 0.7
           OR ($3::text IS NOT NULL AND $3::text != '' AND similarity(body, $3::text) > 0.7)
         ) LIMIT 1`,
        [user.id, title, description || null]
      )
      if (duplicate) {
        return NextResponse.json({ error: 'duplicateRequest' }, { status: 409 })
      }
    }

    const structuredTags: { id?: number; slug: string }[] = body.structured_tags || []

    const row = await withTransaction(async (client) => {
      const res = await client.query(
        `INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, language, tags, is_public, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [user.id, title, sanitizeBody(description), type, content_level,
         fandom_type || 'original', pairing || 'any', language || 'ru',
         tagsArr, is_public ?? true, status || 'draft']
      )
      const request = res.rows[0]

      // Dual-write: insert into request_tags (batch to avoid N+1)
      if (structuredTags.length > 0) {
        // Collect ids we already know, and slugs we need to look up
        const knownIds: number[] = structuredTags.filter(t => t.id).map(t => t.id!)
        const unknownSlugs = structuredTags.filter(t => !t.id).map(t => t.slug)

        let lookedUpIds: number[] = []
        if (unknownSlugs.length > 0) {
          const found = await client.query<{ id: number }>(
            'SELECT id FROM tags WHERE slug = ANY($1)', [unknownSlugs]
          )
          lookedUpIds = found.rows.map(r => r.id)
        }

        const allTagIds = [...knownIds, ...lookedUpIds]
        if (allTagIds.length > 0) {
          await client.query(
            'INSERT INTO request_tags (request_id, tag_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING',
            [request.id, allTagIds]
          )
        }
      }

      return request
    })

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error('[API /api/requests] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
