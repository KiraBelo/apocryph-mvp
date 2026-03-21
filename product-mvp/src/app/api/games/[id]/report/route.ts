import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { requireParticipant } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })

  const { allowed } = rateLimit(`report:${user!.id}`, 3, 60 * 60_000)
  if (!allowed) return NextResponse.json({ error: 'errors.tooManyRequests' }, { status: 429 })

  const { id: gameId } = await params
  let reason: string | undefined
  try {
    ({ reason } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  if (reason && reason.length > 2000) return NextResponse.json({ error: 'reportTooLong' }, { status: 400 })

  try {
    // Verify reporter is a participant of this game
    const participant = await requireParticipant(gameId, user!.id)
    if (!participant) return NextResponse.json({ error: 'notParticipant' }, { status: 403 })

    // Prevent duplicate pending reports from the same user
    const existing = await queryOne(
      "SELECT id FROM reports WHERE game_id=$1 AND reporter_id=$2 AND status='pending'",
      [gameId, user!.id]
    )
    if (existing) return NextResponse.json({ error: 'alreadyReported' }, { status: 409 })

    await query(
      'INSERT INTO reports (game_id, reporter_id, reason) VALUES ($1,$2,$3)',
      [gameId, user!.id, reason || 'Не указано']
    )

    // Auto-hide: 2+ distinct reporters → hide game for moderation review
    const countResult = await queryOne<{ cnt: string }>(
      `SELECT COUNT(DISTINCT reporter_id) as cnt FROM reports WHERE game_id = $1 AND status = 'pending'`,
      [gameId]
    )
    if (parseInt(countResult?.cnt || '0') >= 2) {
      await query(
        `UPDATE games SET moderation_status = 'hidden' WHERE id = $1 AND moderation_status = 'visible'`,
        [gameId]
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/games/[id]/report] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
