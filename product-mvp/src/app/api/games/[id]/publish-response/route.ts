import { NextRequest, NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { notifyGame } from '@/lib/sse'

// POST — partner responds to publish proposal
// choice: 'publish_as_is' | 'edit_first' | 'decline'
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })

  const { id: gameId } = await params
  let choice: string
  try {
    ({ choice } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }
  if (!['publish_as_is', 'edit_first', 'decline'].includes(choice)) {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

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

      // Check that partner already proposed (has consent record)
      const partnerConsentRes = await client.query(
        `SELECT 1 FROM game_publish_consent c
         JOIN game_participants gp ON gp.id = c.participant_id
         WHERE c.game_id=$1 AND gp.user_id != $2 AND c.consented = true`,
        [gameId, user.id]
      )
      if (partnerConsentRes.rows.length === 0) {
        return { error: 'forbidden', status: 403 }
      }

      if (choice === 'decline') {
        // Partner declines — keep proposer's consent, game stays active
        return { ok: true, newStatus: 'active' }
      }

      // Both choices: add my consent
      await client.query(
        `INSERT INTO game_publish_consent (game_id, participant_id, consented, created_at)
         VALUES ($1, $2, true, NOW())
         ON CONFLICT (game_id, participant_id) DO UPDATE SET consented = true, created_at = NOW()`,
        [gameId, me.id]
      )

      const newStatus = choice === 'publish_as_is' ? 'moderation' : 'preparing'
      await client.query('UPDATE games SET status=$1 WHERE id=$2', [newStatus, gameId])

      return { ok: true, newStatus }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    notifyGame(gameId, { _type: 'statusChanged', status: result.newStatus, choice })
    return NextResponse.json({ ok: true, status: result.newStatus })
  } catch (error) {
    console.error('[API /api/games/[id]/publish-response] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
