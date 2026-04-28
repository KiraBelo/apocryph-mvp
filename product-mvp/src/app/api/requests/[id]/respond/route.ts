import { NextRequest, NextResponse } from 'next/server'
import { queryOne, withTransaction } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { escapeHtml } from '@/lib/game-utils'

// POST /api/requests/[id]/respond — откликнуться на заявку
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  // HIGH-S3 (audit-v4): rate limit per user. Joining games is a deliberate
  // action — 10/min is plenty for humans, blocks bots that try to scrape
  // every active request by responding.
  const { allowed } = rateLimit(`respond:${user.id}`, 10, 60_000)
  if (!allowed) return NextResponse.json({ error: 'limitReached' }, { status: 429 })

  const { id: requestId } = await params
  let nickname: string | undefined
  try {
    ({ nickname } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  if (nickname && nickname.length > 50) {
    return NextResponse.json({ error: 'nicknameTooLong' }, { status: 400 })
  }

  try {
    const request = await queryOne<{
      id: string; author_id: string; type: string; status: string; body: string | null; title: string; tags: string[]
    }>('SELECT * FROM requests WHERE id=$1', [requestId])

    if (!request || request.status !== 'active') {
      return NextResponse.json({ error: 'requestNotActive' }, { status: 404 })
    }

    // Author cannot respond to their own request
    if (request.author_id === user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
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
        // SECURITY (CRIT-5, audit-v4): defence-in-depth FOR UPDATE on the
        // games lookup. The outer requests-row lock (line 41) does serialise
        // concurrent responds in Read Committed, but adding FOR UPDATE here
        // protects future code that might reorder the locks.
        // SKIP-TEST: race-condition behaviour requires a real Postgres + two
        // concurrent transactions; not expressible at unit/integration level
        // with mocked db. Covered by manual concurrency check after deploy.
        const existing = await client.query(
          'SELECT id FROM games WHERE request_id=$1 ORDER BY created_at LIMIT 1 FOR UPDATE',
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

      // Проверяем не является ли пользователь уже участником этой игры.
      // Для multiplayer игра могла быть создана ранее и пользователь уже откликнулся.
      const already = await client.query(
        'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2',
        [game!.id, user.id]
      )
      if (already.rows[0]) {
        throw new Error('ALREADY_PARTICIPANT')
      }

      // Добавляем откликнувшегося
      await client.query(
        `INSERT INTO game_participants (game_id, user_id, nickname)
         VALUES ($1, $2, $3) ON CONFLICT (game_id, user_id) DO NOTHING`,
        [game!.id, user.id, nickname || 'Игрок']
      )

      return game!.id
    }).catch(err => {
      if (err.message === 'REQUEST_UNAVAILABLE') return { notActive: true }
      if (err.message === 'ALREADY_PARTICIPANT') return { alreadyParticipant: true }
      throw err
    })

    if (typeof gameId === 'object' && gameId !== null) {
      if ('notActive' in gameId) return NextResponse.json({ error: 'requestNotActive' }, { status: 404 })
      if ('alreadyParticipant' in gameId) return NextResponse.json({ error: 'alreadyResponded' }, { status: 409 })
    }
    return NextResponse.json({ gameId })
  } catch (error) {
    console.error('[API /api/requests/[id]/respond] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
