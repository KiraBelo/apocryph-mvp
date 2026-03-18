import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db'
import { requireUser } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })

  const { id: gameId } = await params
  let body: { consent?: boolean; action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  // ── Reopen ──
  if (body.action === 'reopen') {
    try {
      const result = await withTransaction(async (client) => {
        const gameRes = await client.query(
          'SELECT status FROM games WHERE id=$1 FOR UPDATE',
          [gameId]
        )
        if (!gameRes.rows[0]) return { error: 'notFound', status: 404 }
        if (gameRes.rows[0].status !== 'finished') {
          return { error: 'gameNotFinished', status: 400 }
        }

        // Must be a participant who hasn't left
        const meRes = await client.query(
          'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2 AND left_at IS NULL',
          [gameId, user!.id]
        )
        if (!meRes.rows[0]) return { error: 'forbidden', status: 403 }

        // Reopen: reset everything
        await client.query(
          "UPDATE games SET status='active', finished_at=NULL, published_at=NULL WHERE id=$1",
          [gameId]
        )
        await client.query(
          'UPDATE game_participants SET finish_consent=false WHERE game_id=$1',
          [gameId]
        )
        await client.query(
          'DELETE FROM game_publish_consent WHERE game_id=$1',
          [gameId]
        )

        return { ok: true, gameStatus: 'active' as const }
      })

      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status })
      }
      return NextResponse.json(result)
    } catch (error) {
      console.error('[API /api/games/[id]/finish] POST reopen:', error)
      return NextResponse.json({ error: 'serverError' }, { status: 500 })
    }
  }

  // ── Toggle finish consent ──
  if (typeof body.consent !== 'boolean') {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  try {
    const result = await withTransaction(async (client) => {
      const gameRes = await client.query(
        'SELECT status FROM games WHERE id=$1 FOR UPDATE',
        [gameId]
      )
      if (!gameRes.rows[0]) return { error: 'notFound', status: 404 }
      if (gameRes.rows[0].status !== 'active') {
        return { error: 'gameAlreadyFinished', status: 400 }
      }

      // Must be a participant who hasn't left
      const meRes = await client.query(
        'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2 AND left_at IS NULL',
        [gameId, user!.id]
      )
      if (!meRes.rows[0]) return { error: 'forbidden', status: 403 }

      // Set consent for current user
      await client.query(
        'UPDATE game_participants SET finish_consent=$3 WHERE game_id=$1 AND user_id=$2',
        [gameId, user!.id, body.consent]
      )

      // Check if ALL active participants have consented
      if (body.consent) {
        const checkRes = await client.query(
          `SELECT
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE finish_consent = true) as agreed
           FROM game_participants
           WHERE game_id=$1 AND left_at IS NULL`,
          [gameId]
        )
        const { total, agreed } = checkRes.rows[0]

        if (parseInt(agreed) + 1 >= parseInt(total)) {
          // +1 because our UPDATE hasn't been reflected in the count yet if within same tx
          // Actually the UPDATE above already set it, so re-check properly:
          const recheck = await client.query(
            `SELECT COUNT(*) as cnt FROM game_participants
             WHERE game_id=$1 AND left_at IS NULL AND finish_consent = false`,
            [gameId]
          )
          if (parseInt(recheck.rows[0].cnt) === 0) {
            await client.query(
              "UPDATE games SET status='finished', finished_at=NOW() WHERE id=$1",
              [gameId]
            )
            return { ok: true, finished: true }
          }
        }
      }

      return { ok: true, finished: false }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API /api/games/[id]/finish] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// GET — current finish consent status
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  if (error) return NextResponse.json({ error }, { status: 401 })

  const { id: gameId } = await params

  try {
    const me = await queryOne<{ id: string }>(
      'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2',
      [gameId, user!.id]
    )
    if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const game = await queryOne<{ status: string; finished_at: string | null }>(
      'SELECT status, finished_at FROM games WHERE id=$1',
      [gameId]
    )

    const participants = await query<{
      user_id: string; nickname: string; finish_consent: boolean; left_at: string | null
    }>(
      `SELECT user_id, nickname, finish_consent, left_at
       FROM game_participants WHERE game_id=$1 ORDER BY created_at`,
      [gameId]
    )

    return NextResponse.json({
      status: game?.status,
      finishedAt: game?.finished_at,
      participants: participants.map(p => ({
        nickname: p.nickname,
        finishConsent: p.finish_consent,
        isMe: p.user_id === user!.id,
        hasLeft: !!p.left_at,
      })),
    })
  } catch (error) {
    console.error('[API /api/games/[id]/finish] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
