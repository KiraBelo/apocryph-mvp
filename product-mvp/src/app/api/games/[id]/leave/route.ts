import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'
import { requireParticipant } from '@/lib/auth'
import { notifyGame } from '@/lib/sse'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  const { id: gameId } = await params
  let reason: string
  try {
    ({ reason } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  if (!reason) return NextResponse.json({ error: 'selectLeaveReason' }, { status: 400 })
  if (reason.length > 500) return NextResponse.json({ error: 'leaveTooLong' }, { status: 400 })

  try {
    // Check participant exists and hasn't already left
    const participant = await requireParticipant(gameId, user.id, { includeLeft: true })
    if (!participant) return NextResponse.json({ error: 'notParticipant' }, { status: 403 })
    if (participant.left_at) return NextResponse.json({ error: 'alreadyLeft' }, { status: 400 })

    await query(
      `UPDATE game_participants SET left_at=NOW(), leave_reason=$3
       WHERE game_id=$1 AND user_id=$2 AND left_at IS NULL`,
      [gameId, user.id, reason]
    )

    // Notify SSE subscribers about participant leaving
    notifyGame(gameId, { _type: 'participantLeft', userId: user.id })

    // (Was: a SELECT counting active participants here, with the comment
    //  «if everyone left — do nothing». The result was never read or
    //  used — pure dead code. audit-v4 low cleanup, removed.)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/games/[id]/leave] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
