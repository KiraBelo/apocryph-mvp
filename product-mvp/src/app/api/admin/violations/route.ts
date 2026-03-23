import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireMod, handleAuthError } from '@/lib/session'

// GET /api/admin/violations?page=1&game_id=...
export async function GET(req: NextRequest) {
  const { error } = await requireMod()
  const authErr = handleAuthError(error)
  if (authErr) return authErr

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const gameId = sp.get('game_id')
  const limit = 50
  const offset = (page - 1) * limit

  const whereClause = gameId ? 'WHERE sv.game_id = $1' : ''
  const params = gameId
    ? [gameId, limit, offset]
    : [limit, offset]

  try {
    const violations = await query(
      `SELECT sv.*, sp.phrase, sp.note as phrase_note,
              req.title as request_title
       FROM stop_violations sv
       JOIN stop_phrases sp ON sp.id = sv.phrase_id
       JOIN games g ON g.id = sv.game_id
       LEFT JOIN requests req ON req.id = g.request_id
       ${whereClause}
       ORDER BY sv.created_at DESC
       LIMIT $${gameId ? 2 : 1} OFFSET $${gameId ? 3 : 2}`,
      params
    )

    const countParams = gameId ? [gameId] : []
    const [countRow] = await query<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM stop_violations sv ${whereClause}`,
      countParams
    )

    return NextResponse.json({
      violations,
      total: parseInt(countRow?.cnt || '0'),
      page,
    })
  } catch (error) {
    console.error('[API /api/admin/violations] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
