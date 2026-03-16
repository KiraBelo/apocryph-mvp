import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db'
import { getUser, requireUser } from '@/lib/session'

const MIN_IC_POSTS = 20

// GET — consent status for all participants
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id: gameId } = await params

  // Verify user is a participant
  const me = await queryOne<{ id: string }>(
    'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2',
    [gameId, user.id]
  )
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Check if game is finished
  const game = await queryOne<{ status: string; published_at: string | null }>(
    'SELECT status, published_at FROM games WHERE id=$1', [gameId]
  )
  const isFinished = game?.status === 'finished'

  // Count IC posts
  const icCount = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM messages WHERE game_id=$1 AND type='ic'",
    [gameId]
  )
  const icPostCount = parseInt(icCount?.count || '0')

  // Get all participants with their consent status
  const participants = await query<{
    participant_id: string; nickname: string; consented: boolean | null; consent_at: string | null
  }>(
    `SELECT gp.id as participant_id, gp.nickname,
            c.consented, c.created_at as consent_at
     FROM game_participants gp
     LEFT JOIN game_publish_consent c ON c.participant_id = gp.id AND c.game_id = gp.game_id
     WHERE gp.game_id = $1
     ORDER BY gp.id`,
    [gameId]
  )

  return NextResponse.json({
    isFinished,
    isPublished: !!game?.published_at,
    icPostCount,
    minIcPosts: MIN_IC_POSTS,
    participants,
  })
}

// POST — give or revoke consent
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })

  const { id: gameId } = await params
  let consent: boolean
  try {
    ({ consent } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }
  if (typeof consent !== 'boolean') {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  const result = await withTransaction(async (client) => {
    // Verify participant
    const meRes = await client.query(
      'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2',
      [gameId, user.id]
    )
    const me = meRes.rows[0]
    if (!me) return { error: 'forbidden', status: 403 }

    // Check game is finished
    const gameRes = await client.query(
      'SELECT status FROM games WHERE id=$1',
      [gameId]
    )
    if (gameRes.rows[0]?.status !== 'finished') {
      return { error: 'gameNotFinished', status: 400 }
    }

    // Check minimum IC posts
    if (consent) {
      const icRes = await client.query(
        "SELECT COUNT(*) as count FROM messages WHERE game_id=$1 AND type='ic'",
        [gameId]
      )
      if (parseInt(icRes.rows[0].count) < MIN_IC_POSTS) {
        return { error: 'tooFewMessages', status: 400 }
      }
    }

    // Upsert consent
    await client.query(
      `INSERT INTO game_publish_consent (game_id, participant_id, consented, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (game_id, participant_id) DO UPDATE SET consented = $3, created_at = NOW()`,
      [gameId, me.id, consent]
    )

    // Check if all participants consented
    const allRes = await client.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE c.consented = true) as agreed
       FROM game_participants gp
       LEFT JOIN game_publish_consent c ON c.participant_id = gp.id AND c.game_id = gp.game_id
       WHERE gp.game_id = $1`,
      [gameId]
    )
    const { total, agreed } = allRes.rows[0]

    if (parseInt(agreed) === parseInt(total) && parseInt(total) > 0) {
      // All consented — publish
      await client.query('UPDATE games SET published_at = NOW() WHERE id = $1', [gameId])
    } else {
      // Not all consented — unpublish
      await client.query('UPDATE games SET published_at = NULL WHERE id = $1', [gameId])
    }

    return { ok: true }
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
