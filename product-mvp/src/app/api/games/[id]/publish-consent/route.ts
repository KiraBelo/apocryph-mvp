import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db'
import { getUser, requireUser, handleAuthError } from '@/lib/session'
import { notifyGame } from '@/lib/sse'
import { MIN_IC_POSTS } from '@/lib/constants'

// GET — consent status + game state for the client
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id: gameId } = await params

  try {
    const me = await queryOne<{ id: string }>(
      'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2',
      [gameId, user.id]
    )
    if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const game = await queryOne<{ status: string; published_at: string | null }>(
      'SELECT status, published_at FROM games WHERE id=$1', [gameId]
    )

    const icCount = await queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM messages WHERE game_id=$1 AND type='ic'",
      [gameId]
    )
    const icPostCount = parseInt(icCount?.count || '0')

    const participants = await query<{
      participant_id: string; nickname: string; consented: boolean | null
    }>(
      `SELECT gp.id as participant_id, gp.nickname, c.consented
       FROM game_participants gp
       LEFT JOIN game_publish_consent c ON c.participant_id = gp.id AND c.game_id = gp.game_id
       WHERE gp.game_id = $1
       ORDER BY gp.id`,
      [gameId]
    )

    return NextResponse.json({
      status: game?.status,
      isPublished: !!game?.published_at,
      icPostCount,
      minIcPosts: MIN_IC_POSTS,
      participants,
    })
  } catch (error) {
    console.error('[API /api/games/[id]/publish-consent] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// POST — propose publication (initiator)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  const { id: gameId } = await params

  try {
    const result = await withTransaction(async (client) => {
      const meRes = await client.query(
        'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2 AND left_at IS NULL',
        [gameId, user.id]
      )
      const me = meRes.rows[0]
      if (!me) return { error: 'forbidden', status: 403 }

      const gameRes = await client.query(
        'SELECT status FROM games WHERE id=$1', [gameId]
      )
      if (gameRes.rows[0]?.status !== 'active') {
        return { error: 'invalidStatus', status: 400 }
      }

      // Check minimum IC posts
      const icRes = await client.query(
        "SELECT COUNT(*) as count FROM messages WHERE game_id=$1 AND type='ic'",
        [gameId]
      )
      if (parseInt(icRes.rows[0].count) < MIN_IC_POSTS) {
        return { error: 'tooFewMessages', status: 400 }
      }

      // Upsert consent for proposer
      await client.query(
        `INSERT INTO game_publish_consent (game_id, participant_id, consented, created_at)
         VALUES ($1, $2, true, NOW())
         ON CONFLICT (game_id, participant_id) DO UPDATE SET consented = true, created_at = NOW()`,
        [gameId, me.id]
      )

      // Notify partner via SSE
      return { ok: true }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    notifyGame(gameId, { _type: 'publishRequest' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/games/[id]/publish-consent] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// DELETE — revoke consent / revoke publication
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  const { id: gameId } = await params

  try {
    const result = await withTransaction(async (client) => {
      const meRes = await client.query(
        'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2 AND left_at IS NULL',
        [gameId, user.id]
      )
      const me = meRes.rows[0]
      if (!me) return { error: 'forbidden', status: 403 }

      const gameRes = await client.query(
        'SELECT status FROM games WHERE id=$1', [gameId]
      )
      const currentStatus = gameRes.rows[0]?.status

      // Delete my consent
      await client.query(
        'DELETE FROM game_publish_consent WHERE game_id=$1 AND participant_id=$2',
        [gameId, me.id]
      )

      // If game was in any advanced state, revert to active
      if (currentStatus && currentStatus !== 'active') {
        await client.query(
          'UPDATE games SET status=$1, published_at=NULL WHERE id=$2',
          ['active', gameId]
        )
        // Delete all consents (both players)
        await client.query('DELETE FROM game_publish_consent WHERE game_id=$1', [gameId])
        // If was published, delete likes too
        if (currentStatus === 'published') {
          await client.query('DELETE FROM game_likes WHERE game_id=$1', [gameId])
        }
      }

      return { ok: true }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    notifyGame(gameId, { _type: 'publishRevoked' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/games/[id]/publish-consent] DELETE:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
