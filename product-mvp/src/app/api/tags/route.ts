import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db'
import { getUser } from '@/lib/session'

interface TagRow {
  id: number
  slug: string
  name: string | null
  category: string
  approved: boolean
  usage_count: number
  matched_alias?: string | null
  parent_tag_id?: number | null
}

// GET /api/tags?q=шерл&category=fandom&lang=ru&limit=15&parent_id=42
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = (searchParams.get('q') || '').trim().toLowerCase().slice(0, 100)
  const category = searchParams.get('category') || null
  const parentId = searchParams.get('parent_id') || null
  const lang = searchParams.get('lang') || 'ru'
  const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 50)

  // Get children of a parent tag (e.g. pairings for a fandom)
  if (parentId) {
    const rows = await query<TagRow>(
      `SELECT t.id, t.slug, COALESCE(ti.name, ti_ru.name, t.slug) as name,
              t.category, t.approved, t.usage_count, t.parent_tag_id
       FROM tags t
       LEFT JOIN tag_i18n ti ON ti.tag_id = t.id AND ti.lang = $1
       LEFT JOIN tag_i18n ti_ru ON ti_ru.tag_id = t.id AND ti_ru.lang = 'ru'
       WHERE t.parent_tag_id = $2
       ORDER BY t.usage_count DESC, t.slug
       LIMIT $3`,
      [lang, parseInt(parentId), limit]
    )
    return NextResponse.json(rows)
  }

  // No query or too short → return popular approved tags
  if (q.length < 2) {
    const sql = `
      SELECT t.id, t.slug, COALESCE(ti.name, ti_ru.name, t.slug) as name,
             t.category, t.approved, t.usage_count
      FROM tags t
      LEFT JOIN tag_i18n ti ON ti.tag_id = t.id AND ti.lang = $1
      LEFT JOIN tag_i18n ti_ru ON ti_ru.tag_id = t.id AND ti_ru.lang = 'ru'
      WHERE t.approved = true
        ${category ? 'AND t.category = $3' : ''}
      ORDER BY t.usage_count DESC, t.slug
      LIMIT $2
    `
    const params: unknown[] = [lang, limit]
    if (category) params.push(category)
    const rows = await query<TagRow>(sql, params)
    return NextResponse.json(rows)
  }

  // Fuzzy search: exact → prefix → contains → trigram similarity
  const escaped = q.replace(/[%_\\]/g, '\\$&')
  const pattern = `%${escaped}%`
  const sql = `
    WITH matched AS (
      SELECT DISTINCT ON (t.id)
        t.id, t.slug,
        COALESCE(ti.name, ti_ru.name, t.slug) as name,
        t.category, t.approved, t.usage_count,
        a.alias as matched_alias,
        CASE
          WHEN t.slug = $1 OR ti.name ILIKE $1 OR a.alias = $1 THEN 0
          WHEN t.slug ILIKE $2 || '%' OR ti.name ILIKE $2 || '%' OR a.alias ILIKE $2 || '%' THEN 1
          WHEN t.slug ILIKE $3 OR ti.name ILIKE $3 OR a.alias ILIKE $3 THEN 2
          ELSE 3
        END as match_rank,
        GREATEST(
          similarity(t.slug, $1),
          COALESCE(similarity(ti.name, $1), 0),
          COALESCE(similarity(a.alias, $1), 0)
        ) as sim
      FROM tags t
      LEFT JOIN tag_i18n ti ON ti.tag_id = t.id AND ti.lang = $4
      LEFT JOIN tag_i18n ti_ru ON ti_ru.tag_id = t.id AND ti_ru.lang = 'ru'
      LEFT JOIN tag_aliases a ON a.tag_id = t.id
      WHERE
        t.slug ILIKE $3 OR ti.name ILIKE $3 OR a.alias ILIKE $3
        OR t.slug % $1 OR ti.name % $1 OR a.alias % $1
        ${category ? 'AND t.category = $6' : ''}
    )
    SELECT id, slug, name, category, approved, usage_count, matched_alias
    FROM matched
    ORDER BY match_rank, sim DESC, usage_count DESC
    LIMIT $5
  `
  const params: unknown[] = [q, q, pattern, lang, limit]
  if (category) params.push(category)

  const rows = await query<TagRow>(sql, params)
  return NextResponse.json(rows)
}

// POST /api/tags — create user tag
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const slug = (body.slug || '').trim().toLowerCase()
  const name = (body.name || slug).trim()

  if (!slug || slug.length < 2 || slug.length > 50) {
    return NextResponse.json({ error: 'Invalid tag' }, { status: 400 })
  }

  if (name.length > 100) {
    return NextResponse.json({ error: 'Name too long' }, { status: 400 })
  }

  // Check existing tag by slug
  const existing = await queryOne<TagRow>(
    `SELECT t.id, t.slug, COALESCE(ti.name, t.slug) as name, t.category, t.approved, t.usage_count
     FROM tags t
     LEFT JOIN tag_i18n ti ON ti.tag_id = t.id AND ti.lang = 'ru'
     WHERE t.slug = $1`,
    [slug]
  )
  if (existing) return NextResponse.json(existing)

  // Check if alias exists → return parent tag
  const aliasMatch = await queryOne<{ tag_id: number }>(
    `SELECT tag_id FROM tag_aliases WHERE alias = $1`,
    [slug]
  )
  if (aliasMatch) {
    const parent = await queryOne<TagRow>(
      `SELECT t.id, t.slug, COALESCE(ti.name, t.slug) as name, t.category, t.approved, t.usage_count
       FROM tags t
       LEFT JOIN tag_i18n ti ON ti.tag_id = t.id AND ti.lang = 'ru'
       WHERE t.id = $1`,
      [aliasMatch.tag_id]
    )
    return NextResponse.json(parent)
  }

  // Rate limit: max 10 new tags per day per user
  const recentCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM tags
     WHERE created_by = $1 AND created_at > NOW() - INTERVAL '1 day'`,
    [user.id]
  )
  if (recentCount && parseInt(recentCount.count) >= 10) {
    return NextResponse.json(
      { error: 'Tag creation limit reached (10/day)' },
      { status: 429 }
    )
  }

  // Validate category
  const VALID_CATEGORIES = ['fandom', 'genre', 'trope', 'setting', 'character_type', 'pairing', 'mood', 'format', 'other']
  const category = VALID_CATEGORIES.includes(body.category) ? body.category : 'other'

  // Validate parent_tag_id (optional, for pairings linked to a fandom)
  const parentTagId = body.parent_tag_id ? parseInt(body.parent_tag_id) : null
  if (parentTagId) {
    const parentExists = await queryOne('SELECT id FROM tags WHERE id = $1', [parentTagId])
    if (!parentExists) {
      return NextResponse.json({ error: 'Parent tag not found' }, { status: 400 })
    }
  }

  // Create new tag (unapproved, unreviewed) in a transaction
  const newTag = await withTransaction(async (client) => {
    const res = await client.query(
      `INSERT INTO tags (slug, category, parent_tag_id, approved, reviewed, created_by)
       VALUES ($1, $3, $4, false, false, $2)
       RETURNING id`,
      [slug, user.id, category, parentTagId]
    )
    const row = res.rows[0] as { id: number } | undefined
    if (row) {
      await client.query(
        `INSERT INTO tag_i18n (tag_id, lang, name) VALUES ($1, 'ru', $2)
         ON CONFLICT (tag_id, lang) DO UPDATE SET name = $2`,
        [row.id, name]
      )
    }
    return row ?? null
  })

  return NextResponse.json({
    id: newTag?.id,
    slug,
    name,
    category,
    approved: false,
    usage_count: 0,
  })
}
