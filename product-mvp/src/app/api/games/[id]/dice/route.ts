import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { query, queryOne } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { notifyGame } from '@/lib/sse'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })

  const { id: gameId } = await params
  const { sides } = await req.json()

  const s = parseInt(sides)
  if (!s || s < 2 || s > 100) {
    return NextResponse.json({ error: 'invalidDice' }, { status: 400 })
  }

  try {
    const participant = await queryOne<{ id: string; nickname: string; left_at: string | null }>(
      'SELECT id, nickname, left_at FROM game_participants WHERE game_id=$1 AND user_id=$2',
      [gameId, user!.id]
    )
    if (!participant || participant.left_at) {
      return NextResponse.json({ error: 'notParticipant' }, { status: 403 })
    }

    const result = crypto.randomInt(1, s + 1)
    const content = JSON.stringify({ sides: s, result, roller: participant.nickname })

    const message = await queryOne(
      `INSERT INTO messages (game_id, participant_id, content, type)
       VALUES ($1, $2, $3, 'dice') RETURNING *`,
      [gameId, participant.id, content]
    )

    const full = await queryOne(
      `SELECT m.*, gp.nickname, gp.avatar_url, gp.user_id
       FROM messages m
       JOIN game_participants gp ON gp.id = m.participant_id
       WHERE m.id = $1`,
      [(message as { id: string }).id]
    )

    notifyGame(gameId, { _type: 'new', ...(full as object) })

    return NextResponse.json({ sides: s, result, roller: participant.nickname }, { status: 201 })
  } catch (error) {
    console.error('[API /api/games/[id]/dice] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
