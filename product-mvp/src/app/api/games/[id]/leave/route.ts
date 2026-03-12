import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id: gameId } = await params
  const { reason } = await req.json()

  if (!reason) return NextResponse.json({ error: 'selectLeaveReason' }, { status: 400 })
  if (reason.length > 500) return NextResponse.json({ error: 'leaveTooLong' }, { status: 400 })

  // Check participant exists and hasn't already left
  const participant = await queryOne<{ id: string; left_at: string | null }>(
    'SELECT id, left_at FROM game_participants WHERE game_id=$1 AND user_id=$2',
    [gameId, user.id]
  )
  if (!participant) return NextResponse.json({ error: 'notParticipant' }, { status: 403 })
  if (participant.left_at) return NextResponse.json({ error: 'alreadyLeft' }, { status: 400 })

  await query(
    `UPDATE game_participants SET left_at=NOW(), leave_reason=$3
     WHERE game_id=$1 AND user_id=$2 AND left_at IS NULL`,
    [gameId, user.id, reason]
  )

  // Проверяем, не осталось ли активных участников
  const active = await query(
    'SELECT id FROM game_participants WHERE game_id=$1 AND left_at IS NULL',
    [gameId]
  )
  // Если все вышли — ничего не делаем, игра просто "завершённая"

  return NextResponse.json({ ok: true })
}
