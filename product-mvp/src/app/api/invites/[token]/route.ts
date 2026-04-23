import { NextRequest, NextResponse } from 'next/server'
import { queryOne, withTransaction } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'
import { escapeHtml } from '@/lib/game-utils'

// GET — информация об инвайте
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const invite = await queryOne<{ request_id: string; used_at: string | null; expires_at: string | null }>(
      'SELECT i.token, i.request_id, i.used_at, i.expires_at, r.title, r.type FROM invites i JOIN requests r ON r.id=i.request_id WHERE i.token=$1',
      [token]
    )
    if (!invite) return NextResponse.json({ error: 'inviteInvalid' }, { status: 404 })
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'inviteExpired' }, { status: 410 })
    }
    return NextResponse.json(invite)
  } catch (error) {
    console.error('[API /api/invites/[token]] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// POST — принять инвайт
export async function POST(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  const { token } = await params

  try {
    const result = await withTransaction(async (client) => {
      // Lock the invite row to prevent concurrent use
      const inviteRes = await client.query(
        'SELECT * FROM invites WHERE token=$1 FOR UPDATE', [token]
      )
      const invite = inviteRes.rows[0]

      if (!invite) return { error: 'inviteInvalid', status: 404 }
      if (invite.used_at) return { error: 'inviteUsed', status: 410 }
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return { error: 'inviteExpired', status: 410 }
      }

      const reqRes = await client.query(
        'SELECT * FROM requests WHERE id=$1', [invite.request_id]
      )
      const request = reqRes.rows[0]
      if (!request) return { error: 'requestNotActive', status: 404 }

      // Author cannot accept their own invite
      if (request.author_id === user.id) return { error: 'forbidden', status: 403 }

      // Создаём или находим игру
      const gameRes = await client.query(
        'SELECT id FROM games WHERE request_id=$1 LIMIT 1', [request.id]
      )
      let gameId = gameRes.rows[0]?.id

      if (!gameId) {
        const newGame = await client.query(
          'INSERT INTO games (request_id) VALUES ($1) RETURNING id', [request.id]
        )
        gameId = newGame.rows[0].id
        // Добавляем автора и получаем его participant.id для первого поста
        const authorRes = await client.query(
          `INSERT INTO game_participants (game_id, user_id, nickname)
           VALUES ($1, $2, 'Игрок') ON CONFLICT (game_id, user_id) DO UPDATE SET game_id=$1 RETURNING id`,
          [gameId, request.author_id]
        )
        const authorParticipant = authorRes.rows[0]

        // Первый пост — текст заявки (как и в /requests/[id]/respond, чтобы игра
        // через инвайт начиналась с того же контекста что и обычный отклик).
        if (authorParticipant) {
          const tagLine = request.tags?.length ? request.tags.map((t: string) => `#${t}`).join(' ') : ''
          const parts = [`<h3>${escapeHtml(request.title)}</h3>`]
          if (tagLine) parts.push(`<p>${tagLine}</p>`)
          if (request.body) parts.push(request.body)
          const firstPostContent = parts.join('\n')

          await client.query(
            `INSERT INTO messages (game_id, participant_id, content, type)
             VALUES ($1, $2, $3, 'ic')`,
            [gameId, authorParticipant.id, firstPostContent]
          )
        }

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
  } catch (error) {
    console.error('[API /api/invites/[token]] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
