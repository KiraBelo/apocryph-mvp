import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireMod } from '@/lib/session'
import { invalidateStopPhraseCache } from '@/lib/stoplist'

// GET /api/admin/stop-list?page=1&search=...
export async function GET(req: NextRequest) {
  const { error } = await requireMod()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'forbidden') return NextResponse.json({ error }, { status: 403 })
  if (error === 'banned') return NextResponse.json({ error }, { status: 403 })

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

  const phrases = await query(
    `SELECT sp.*, u.email as created_by_email
     FROM stop_phrases sp
     LEFT JOIN users u ON u.id = sp.created_by
     ${whereClause}
     ORDER BY sp.created_at DESC
     LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`,
    params
  )

  const countParams = search ? [search.replace(/[%_\\]/g, '\\$&')] : []
  const [countRow] = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM stop_phrases sp ${whereClause}`,
    countParams
  )

  return NextResponse.json({
    phrases,
    total: parseInt(countRow?.cnt || '0'),
    page,
  })
}

// POST /api/admin/stop-list — create phrase
export async function POST(req: NextRequest) {
  const { error, user } = await requireMod()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'forbidden') return NextResponse.json({ error }, { status: 403 })
  if (error === 'banned') return NextResponse.json({ error }, { status: 403 })

  const { phrase, note } = await req.json()
  const cleaned = (phrase || '').trim().toLowerCase()
  if (cleaned.length < 3) {
    return NextResponse.json({ error: 'phraseTooShort' }, { status: 400 })
  }
  if (cleaned.length > 200) {
    return NextResponse.json({ error: 'phraseTooLong' }, { status: 400 })
  }

  const row = await query(
    `INSERT INTO stop_phrases (phrase, note, created_by)
     VALUES ($1, $2, $3) RETURNING *`,
    [cleaned, note?.trim() || null, user!.id]
  )

  invalidateStopPhraseCache()
  return NextResponse.json({ phrase: row[0] }, { status: 201 })
}
