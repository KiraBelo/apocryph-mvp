import { NextRequest, NextResponse } from 'next/server'
import { queryOne, withTransaction } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'
import { notifyGame } from '@/lib/sse'

// POST — submit a 'preparing' game to moderation queue
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  const authErr = handleAuthError(error)
  if (authErr) return authErr

  const { id: gameId } = await params

  try {
    const result = await withTransaction(async (client) => {
      const meRes = await client.query(
        'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2 AND left_at IS NULL',
        [gameId, user!.id]
      )
      if (!meRes.rows[0]) return { error: 'forbidden', status: 403 }

      const gameRes = await client.query(
        'SELECT status FROM games WHERE id=$1', [gameId]
      )
      if (gameRes.rows[0]?.status !== 'preparing') {
        return { error: 'invalidStatus', status: 400 }
      }

      // Both participants must have consented
      const consentRes = await client.query(
        `SELECT COUNT(*) as total,
                COUNT(c.participant_id) FILTER (WHERE c.consented = true) as agreed
         FROM game_participants gp
         LEFT JOIN game_publish_consent c ON c.participant_id = gp.id AND c.game_id = gp.game_id
         WHERE gp.game_id = $1 AND gp.left_at IS NULL`,
        [gameId]
      )
      const { total, agreed } = consentRes.rows[0]
      if (parseInt(agreed) < parseInt(total)) {
        return { error: 'forbidden', status: 403 }
      }

      await client.query("UPDATE games SET status='moderation' WHERE id=$1", [gameId])
      return { ok: true }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    notifyGame(gameId, { _type: 'statusChanged', status: 'moderation' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/games/[id]/submit-to-moderation] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
