import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { queryOne } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'
import { requireParticipant } from '@/lib/auth'
import { notifyGame } from '@/lib/sse'
import { rateLimit } from '@/lib/rate-limit'
import { sanitizeNickname } from '@/lib/sanitize'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  const authErr = handleAuthError(error)
  if (authErr) return authErr

  const { allowed } = rateLimit(`dice:${user!.id}`, 10, 60_000)
  if (!allowed) return NextResponse.json({ error: 'errors.tooManyRequests' }, { status: 429 })

  const { id: gameId } = await params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }
  const { sides } = body

  const s = Number(sides)
  if (!Number.isInteger(s) || s < 2 || s > 100) {
    return NextResponse.json({ error: 'invalidDice' }, { status: 400 })
  }

  try {
    const game = await queryOne<{ status: string }>('SELECT status FROM games WHERE id=$1', [gameId])
    if (!game) return NextResponse.json({ error: 'notFound' }, { status: 404 })
    if (game.status !== 'active') return NextResponse.json({ error: 'gameNotActive' }, { status: 403 })

    const participant = await requireParticipant(gameId, user!.id)
    if (!participant) {
      return NextResponse.json({ error: 'notParticipant' }, { status: 403 })
    }

    const result = crypto.randomInt(1, s + 1)
    const safeNickname = sanitizeNickname(participant.nickname)
    const content = JSON.stringify({ sides: s, result, roller: safeNickname })

    const message = await queryOne<{ id: string }>(
      `INSERT INTO messages (game_id, participant_id, content, type)
       VALUES ($1, $2, $3, 'dice') RETURNING id`,
      [gameId, participant.id, content]
    )
    if (!message) return NextResponse.json({ error: 'serverError' }, { status: 500 })

    const full = await queryOne<Record<string, unknown>>(
      `SELECT m.*, gp.nickname, gp.avatar_url, gp.user_id
       FROM messages m
       JOIN game_participants gp ON gp.id = m.participant_id
       WHERE m.id = $1`,
      [message.id]
    )

    if (full) notifyGame(gameId, { _type: 'new', ...full })

    return NextResponse.json({ sides: s, result, roller: safeNickname }, { status: 201 })
  } catch (error) {
    console.error('[API /api/games/[id]/dice] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
