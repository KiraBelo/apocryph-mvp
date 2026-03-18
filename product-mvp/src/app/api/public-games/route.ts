import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'

const PAGE_SIZE = 30

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const type = sp.get('type')
  const fandomType = sp.get('fandom_type')
  const pairing = sp.get('pairing')
  const content = sp.get('content')
  const tags = sp.get('tags')
  const q = sp.get('q')

  const conditions: string[] = [
    'g.published_at IS NOT NULL',
    "g.moderation_status = 'visible'",
  ]
  const params: unknown[] = []
  let p = 1

  if (type) { conditions.push(`r.type = $${p++}`); params.push(type) }
  if (fandomType) { conditions.push(`r.fandom_type = $${p++}`); params.push(fandomType) }
  if (pairing) { conditions.push(`r.pairing = $${p++}`); params.push(pairing) }
  if (content) { conditions.push(`r.content_level = $${p++}`); params.push(content) }

  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    if (tagList.length > 0) {
      conditions.push(`r.tags && $${p++}`)
      params.push(tagList)
    }
  }

  if (q) {
    const escaped = q.replace(/[%_\\]/g, '\\$&')
    const like = `%${escaped}%`
    conditions.push(`(r.title ILIKE $${p} OR r.body ILIKE $${p})`)
    p++
    params.push(like)
  }

  // Blacklist for logged-in users
  const user = await getUser()
  if (user) {
    const bl = await query<{ tag: string }>('SELECT tag FROM user_tag_blacklist WHERE user_id = $1', [user.id])
    if (bl.length > 0) {
      conditions.push(`NOT (r.tags && $${p++})`)
      params.push(bl.map(r => r.tag))
    }
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  try {
    const countRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM games g LEFT JOIN requests r ON r.id = g.request_id ${where}`,
      params
    )
    const total = parseInt(countRes?.count || '0')
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const offset = (page - 1) * PAGE_SIZE

    const games = await query<{
      id: string; published_at: string; banner_url: string | null;
      request_title: string | null; request_type: string | null;
      request_fandom_type: string | null; request_pairing: string | null;
      request_content_level: string | null; request_tags: string[] | null;
      ic_count: string; participants: string
    }>(
      `SELECT g.id, g.published_at, g.banner_url,
              r.title as request_title, r.type as request_type,
              r.fandom_type as request_fandom_type, r.pairing as request_pairing,
              r.content_level as request_content_level, r.tags as request_tags,
              (SELECT COUNT(*) FROM messages m WHERE m.game_id = g.id AND m.type = 'ic')::text as ic_count,
              (SELECT json_agg(json_build_object('nickname', gp.nickname, 'avatar_url', gp.avatar_url))
                FROM game_participants gp WHERE gp.game_id = g.id)::text as participants
       FROM games g
       LEFT JOIN requests r ON r.id = g.request_id
       ${where}
       ORDER BY g.published_at DESC
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, PAGE_SIZE, offset]
    )

    const safeGames = games.map(g => ({
      ...g,
      participants: g.participants ? JSON.parse(g.participants) : [],
    }))

    return NextResponse.json({ games: safeGames, total, page, totalPages })
  } catch (error) {
    console.error('[API /api/public-games] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
