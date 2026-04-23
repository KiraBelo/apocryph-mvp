import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireMod, handleAuthError } from '@/lib/session'
import { invalidateStopPhraseCache } from '@/lib/stoplist'

// GET /api/admin/stop-list?page=1&search=...
export async function GET(req: NextRequest) {
  const { error } = await requireMod()
  const authErr = handleAuthError(error)
  if (authErr) return authErr

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const search = (sp.get('search') || '').trim()
  const limit = 50
  const offset = (page - 1) * limit

  const whereClause = search
    ? `WHERE sp.phrase ILIKE '%' || $1 || '%'`
    : ''
  const params = search
    ? [search.replace(/[%_\\]/g, '\\$&'), limit, offset]
    : [limit, offset]

  try {
    const phrases = await query<{ _total: string }>(
      `SELECT sp.*, u.email as created_by_email,
              COUNT(*) OVER() as _total
       FROM stop_phrases sp
       LEFT JOIN users u ON u.id = sp.created_by
       ${whereClause}
       ORDER BY sp.created_at DESC
       LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`,
      params
    )
    const total = phrases.length > 0 ? parseInt(phrases[0]._total) : 0
    const safePhrases = phrases.map(({ _total, ...rest }) => rest)

    return NextResponse.json({
      phrases: safePhrases,
      total,
      page,
    })
  } catch (error) {
    console.error('[API /api/admin/stop-list] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// POST /api/admin/stop-list — create phrase
export async function POST(req: NextRequest) {
  const auth = await requireMod()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }
  const { phrase, note } = body
  const cleaned = (phrase || '').trim().toLowerCase()
  if (cleaned.length < 3) {
    return NextResponse.json({ error: 'phraseTooShort' }, { status: 400 })
  }
  if (cleaned.length > 200) {
    return NextResponse.json({ error: 'phraseTooLong' }, { status: 400 })
  }

  try {
    const row = await query(
      `INSERT INTO stop_phrases (phrase, note, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [cleaned, note?.trim() || null, user.id]
    )

    invalidateStopPhraseCache()
    return NextResponse.json({ phrase: row[0] }, { status: 201 })
  } catch (error) {
    console.error('[API /api/admin/stop-list] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
