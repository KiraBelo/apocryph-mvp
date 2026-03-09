import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getUser } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { id: gameId } = await params
  const { reason } = await req.json()

  if (!reason) return NextResponse.json({ error: 'Укажите причину выхода' }, { status: 400 })
  if (reason.length > 500) return NextResponse.json({ error: 'Причина слишком длинная' }, { status: 400 })

  await query(
    `UPDATE game_participants SET left_at=NOW(), leave_reason=$3
     WHERE game_id=$1 AND user_id=$2`,
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
