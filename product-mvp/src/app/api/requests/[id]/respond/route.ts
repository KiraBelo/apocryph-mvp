import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { escapeHtml } from '@/lib/game-utils'

// POST /api/requests/[id]/respond — откликнуться на заявку
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })

  const { id: requestId } = await params
  const { nickname } = await req.json()

  if (nickname && nickname.length > 50) {
    return NextResponse.json({ error: 'nicknameTooLong' }, { status: 400 })
  }

  const request = await queryOne<{
    id: string; author_id: string; type: string; status: string; body: string | null; title: string; tags: string[]
  }>('SELECT * FROM requests WHERE id=$1', [requestId])

  if (!request || request.status !== 'active') {
    return NextResponse.json({ error: 'requestNotActive' }, { status: 404 })
  }

  // Wrap in transaction to prevent race conditions (two simultaneous responds creating duplicate games)
  const gameId = await withTransaction(async (client) => {
    // Lock the request row to serialize concurrent responds
    const locked = await client.query(
      'SELECT id, status FROM requests WHERE id = $1 FOR UPDATE',
      [requestId]
    )
    if (locked.rows[0]?.status !== 'active') {
      throw new Error('REQUEST_UNAVAILABLE')
    }

    let game: { id: string } | null = null

    if (request.type === 'multiplayer') {
      const existing = await client.query(
        'SELECT id FROM games WHERE request_id=$1 ORDER BY created_at LIMIT 1',
        [requestId]
      )
      game = existing.rows[0] || null
    }

    if (!game) {
      const created = await client.query(
        'INSERT INTO games (request_id) VALUES ($1) RETURNING id',
        [requestId]
      )
      game = created.rows[0]

      // Добавляем автора заявки как участника
      const authorRes = await client.query(
        `INSERT INTO game_participants (game_id, user_id, nickname)
         VALUES ($1, $2, 'Игрок') ON CONFLICT (game_id, user_id) DO UPDATE SET game_id=$1 RETURNING id`,
        [game!.id, request.author_id]
      )
      const authorParticipant = authorRes.rows[0]

      // Первый пост — текст заявки
      if (authorParticipant) {
        const tagLine = request.tags?.length ? request.tags.map(t => `#${t}`).join(' ') : ''
        const parts = [`<h3>${escapeHtml(request.title)}</h3>`]
        if (tagLine) parts.push(`<p>${tagLine}</p>`)
        if (request.body) parts.push(request.body)
        const firstPostContent = parts.join('\n')

        await client.query(
          `INSERT INTO messages (game_id, participant_id, content, type)
           VALUES ($1, $2, $3, 'ic')`,
          [game!.id, authorParticipant.id, firstPostContent]
        )
      }

      // Для duo — снимаем из ленты
      if (request.type === 'duo') {
        await client.query("UPDATE requests SET status='inactive' WHERE id=$1", [requestId])
      }
    }

    // Добавляем откликнувшегося
    await client.query(
      `INSERT INTO game_participants (game_id, user_id, nickname)
       VALUES ($1, $2, $3) ON CONFLICT (game_id, user_id) DO NOTHING`,
      [game!.id, user.id, nickname || 'Игрок']
    )

    return game!.id
  }).catch(err => {
    if (err.message === 'REQUEST_UNAVAILABLE') return null
    throw err
  })

  if (!gameId) return NextResponse.json({ error: 'requestNotActive' }, { status: 404 })
  return NextResponse.json({ gameId })
}
