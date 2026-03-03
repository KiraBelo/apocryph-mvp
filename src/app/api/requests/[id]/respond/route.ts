import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'

// POST /api/requests/[id]/respond — откликнуться на заявку
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { id: requestId } = await params
  const { nickname } = await req.json()

  const request = await queryOne<{
    id: string; author_id: string; type: string; status: string
  }>('SELECT * FROM requests WHERE id=$1', [requestId])

  if (!request || request.status !== 'active') {
    return NextResponse.json({ error: 'Заявка недоступна' }, { status: 404 })
  }

  // Если тип duo — ищем существующую игру, или создаём новую и убираем заявку из ленты
  // Если multiplayer — все попадают в одну игру (создаём если нет)
  let game: { id: string } | null = null

  if (request.type === 'multiplayer') {
    // Найти существующую игру для этой заявки
    game = await queryOne<{ id: string }>(
      'SELECT id FROM games WHERE request_id=$1 ORDER BY created_at LIMIT 1',
      [requestId]
    )
  }

  if (!game) {
    // Создаём новую игру
    game = await queryOne<{ id: string }>(
      'INSERT INTO games (request_id) VALUES ($1) RETURNING id',
      [requestId]
    )

    // Добавляем автора заявки как участника
    await query(
      `INSERT INTO game_participants (game_id, user_id, nickname)
       VALUES ($1, $2, 'Игрок') ON CONFLICT DO NOTHING`,
      [game!.id, request.author_id]
    )

    // Для duo — снимаем из ленты
    if (request.type === 'duo') {
      await query("UPDATE requests SET status='inactive' WHERE id=$1", [requestId])
    }
  }

  // Добавляем откликнувшегося
  await query(
    `INSERT INTO game_participants (game_id, user_id, nickname)
     VALUES ($1, $2, $3) ON CONFLICT (game_id, user_id) DO NOTHING`,
    [game!.id, user.id, nickname || 'Игрок']
  )

  return NextResponse.json({ gameId: game!.id })
}
