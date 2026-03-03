import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'

// GET — информация об инвайте
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await queryOne<{ request_id: string; used_at: string | null }>(
    'SELECT i.*, r.title, r.type FROM invites i JOIN requests r ON r.id=i.request_id WHERE i.token=$1',
    [token]
  )
  if (!invite) return NextResponse.json({ error: 'Ссылка недействительна' }, { status: 404 })
  return NextResponse.json(invite)
}

// POST — принять инвайт
export async function POST(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { token } = await params
  const invite = await queryOne<{
    request_id: string; used_at: string | null; token: string
  }>('SELECT * FROM invites WHERE token=$1', [token])

  if (!invite) return NextResponse.json({ error: 'Ссылка недействительна' }, { status: 404 })

  const request = await queryOne<{ id: string; author_id: string; type: string; status: string }>(
    'SELECT * FROM requests WHERE id=$1', [invite.request_id]
  )
  if (!request) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })

  // Создаём или находим игру
  let game = await queryOne<{ id: string }>(
    'SELECT id FROM games WHERE request_id=$1 LIMIT 1', [request.id]
  )

  if (!game) {
    game = await queryOne<{ id: string }>(
      'INSERT INTO games (request_id) VALUES ($1) RETURNING id', [request.id]
    )
    // Добавляем автора
    await query(
      "INSERT INTO game_participants (game_id, user_id, nickname) VALUES ($1,$2,'Игрок') ON CONFLICT DO NOTHING",
      [game!.id, request.author_id]
    )
    // Для duo снимаем из ленты
    if (request.type === 'duo') {
      await query("UPDATE requests SET status='inactive' WHERE id=$1", [request.id])
    }
  }

  await query(
    "INSERT INTO game_participants (game_id, user_id, nickname) VALUES ($1,$2,'Игрок') ON CONFLICT DO NOTHING",
    [game!.id, user.id]
  )

  // Помечаем инвайт использованным
  await query('UPDATE invites SET used_at=NOW() WHERE token=$1', [token])

  return NextResponse.json({ gameId: game!.id })
}
