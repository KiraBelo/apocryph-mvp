import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireMod } from '@/lib/session'

// GET /api/admin/reports?status=pending&page=1
export async function GET(req: NextRequest) {
  const { error, user } = await requireMod()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'forbidden') return NextResponse.json({ error }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const status = sp.get('status') || 'pending'
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  try {
    const reports = await query(
      `SELECT r.id, r.game_id, r.reporter_id, r.reason, r.status, r.created_at,
              r.resolved_by, r.resolved_at,
              g.moderation_status,
              req.title as request_title,
              (SELECT COUNT(DISTINCT reporter_id) FROM reports WHERE game_id = r.game_id AND status = 'pending') as pending_count
       FROM reports r
       JOIN games g ON g.id = r.game_id
       LEFT JOIN requests req ON req.id = g.request_id
       WHERE r.status = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    )

    // Total count for pagination
    const countRow = await query<{ cnt: string }>(
      'SELECT COUNT(*) as cnt FROM reports WHERE status = $1',
      [status]
    )
    const total = parseInt(countRow[0]?.cnt || '0')

    return NextResponse.json({ reports, total, page, user: { id: user!.id, role: user!.role } })
  } catch (error) {
    console.error('[API /api/admin/reports] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
