import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireMod } from '@/lib/session'

// PATCH /api/admin/reports/[id] — resolve or dismiss a report
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireMod()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'forbidden') return NextResponse.json({ error }, { status: 403 })

  const { id: reportId } = await params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }
  const { status } = body

  if (!status || !['resolved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'invalidStatus' }, { status: 400 })
  }

  try {
    // Update the report
    const report = await queryOne<{ game_id: string }>(
      `UPDATE reports SET status = $1, resolved_by = $2, resolved_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING game_id`,
      [status, user!.id, reportId]
    )
    if (!report) return NextResponse.json({ error: 'notFound' }, { status: 404 })

    // If dismissed: check if all pending reports for this game are now resolved/dismissed
    // If so, unhide the game
    if (status === 'dismissed') {
      const remaining = await queryOne<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM reports WHERE game_id = $1 AND status = 'pending'`,
        [report.game_id]
      )
      if (parseInt(remaining?.cnt || '0') === 0) {
        await query(
          `UPDATE games SET moderation_status = 'visible' WHERE id = $1`,
          [report.game_id]
        )
      }
    }

    // If resolved: game stays hidden (read-only for participants)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/admin/reports/[id]] PATCH:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
