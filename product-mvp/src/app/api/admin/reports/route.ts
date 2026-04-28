import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireMod, handleAuthError } from '@/lib/session'

// GET /api/admin/reports?status=pending&page=1
export async function GET(req: NextRequest) {
  const auth = await requireMod()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  const sp = req.nextUrl.searchParams
  const status = sp.get('status') || 'pending'
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  try {
    // Single query — `COUNT(*) OVER()` returns the unfiltered total
    // alongside each row, so we don't pay for a second roundtrip just
    // to drive pagination (audit-v4 medium).
    const reports = await query<{
      id: string; game_id: string; reporter_id: string; reason: string; status: string
      created_at: string; resolved_by: string | null; resolved_at: string | null
      moderation_status: string; request_title: string | null; pending_count: string
      _total: string
    }>(
      `SELECT r.id, r.game_id, r.reporter_id, r.reason, r.status, r.created_at,
              r.resolved_by, r.resolved_at,
              g.moderation_status,
              req.title as request_title,
              (SELECT COUNT(DISTINCT reporter_id) FROM reports WHERE game_id = r.game_id AND status = 'pending') as pending_count,
              COUNT(*) OVER() as _total
       FROM reports r
       JOIN games g ON g.id = r.game_id
       LEFT JOIN requests req ON req.id = g.request_id
       WHERE r.status = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    )
    const total = reports.length > 0 ? parseInt(reports[0]._total) : 0
    const sanitized = reports.map(({ _total, ...rest }) => { void _total; return rest })

    return NextResponse.json({ reports: sanitized, total, page, user: { id: user.id, role: user.role } })
  } catch (error) {
    console.error('[API /api/admin/reports] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
