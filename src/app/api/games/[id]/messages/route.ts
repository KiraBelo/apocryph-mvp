import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'
import { notifyGame } from '@/lib/sse'
import { sanitizeBody } from '@/lib/sanitize'

// GET — история сообщений
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const rows = await query(
    `SELECT m.*, gp.nickname, gp.avatar_url, gp.user_id
     FROM messages m
     JOIN game_participants gp ON gp.id = m.participant_id
     WHERE m.game_id = $1
     ORDER BY m.created_at ASC`,
    [gameId]
  )
  return NextResponse.json(rows)
}

// POST — отправить сообщение
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { id: gameId } = await params
  const { content, type = 'ic' } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Пустое сообщение' }, { status: 400 })
  if (content.length > 200_000) return NextResponse.json({ error: 'Сообщение слишком длинное' }, { status: 400 })
  const msgType = type === 'ooc' ? 'ooc' : 'ic'

  // Найти participant
  const participant = await queryOne<{ id: string; left_at: string | null }>(
    'SELECT id, left_at FROM game_participants WHERE game_id=$1 AND user_id=$2',
    [gameId, user.id]
  )
  if (!participant || participant.left_at) {
    return NextResponse.json({ error: 'Вы не участник этой игры' }, { status: 403 })
  }

  const message = await queryOne(
    `INSERT INTO messages (game_id, participant_id, content, type)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [gameId, participant.id, sanitizeBody(content), msgType]
  )

  // Получаем полные данные с никнеймом
  const full = await queryOne(
    `SELECT m.*, gp.nickname, gp.avatar_url, gp.user_id
     FROM messages m
     JOIN game_participants gp ON gp.id = m.participant_id
     WHERE m.id = $1`,
    [(message as { id: string }).id]
  )

  // Нотифицируем SSE-слушателей
  notifyGame(gameId, { _type: 'new', ...(full as object) })

  return NextResponse.json(full, { status: 201 })
}
