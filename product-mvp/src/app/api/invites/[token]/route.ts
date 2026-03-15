import { NextRequest, NextResponse } from 'next/server'
import { queryOne, withTransaction } from '@/lib/db'
import { getUser } from '@/lib/session'

// GET — информация об инвайте
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await queryOne<{ request_id: string; used_at: string | null }>(
    'SELECT i.token, i.request_id, i.used_at, r.title, r.type FROM invites i JOIN requests r ON r.id=i.request_id WHERE i.token=$1',
    [token]
  )
  if (!invite) return NextResponse.json({ error: 'inviteInvalid' }, { status: 404 })
  return NextResponse.json(invite)
}

// POST — принять инвайт
export async function POST(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { token } = await params

  const result = await withTransaction(async (client) => {
    // Lock the invite row to prevent concurrent use
    const inviteRes = await client.query(
      'SELECT * FROM invites WHERE token=$1 FOR UPDATE', [token]
    )
    const invite = inviteRes.rows[0]

    if (!invite) return { error: 'inviteInvalid', status: 404 }
    if (invite.used_at) return { error: 'inviteUsed', status: 410 }

    const reqRes = await client.query(
      'SELECT * FROM requests WHERE id=$1', [invite.request_id]
    )
    const request = reqRes.rows[0]
    if (!request) return { error: 'requestNotActive', status: 404 }

    // Создаём или находим игру
    let gameRes = await client.query(
      'SELECT id FROM games WHERE request_id=$1 LIMIT 1', [request.id]
    )
    let gameId = gameRes.rows[0]?.id

    if (!gameId) {
      const newGame = await client.query(
        'INSERT INTO games (request_id) VALUES ($1) RETURNING id', [request.id]
      )
      gameId = newGame.rows[0].id
      // Добавляем автора
      await client.query(
        "INSERT INTO game_participants (game_id, user_id, nickname) VALUES ($1,$2,'Игрок') ON CONFLICT DO NOTHING",
        [gameId, request.author_id]
      )
      // Для duo снимаем из ленты
      if (request.type === 'duo') {
        await client.query("UPDATE requests SET status='inactive' WHERE id=$1", [request.id])
      }
    }

    await client.query(
      "INSERT INTO game_participants (game_id, user_id, nickname) VALUES ($1,$2,'Игрок') ON CONFLICT DO NOTHING",
      [gameId, user.id]
    )

    // Помечаем инвайт использованным
    await client.query('UPDATE invites SET used_at=NOW() WHERE token=$1', [token])

    return { gameId }
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ gameId: result.gameId })
}
