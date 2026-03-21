import { NextRequest, NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db'
import { requireMod } from '@/lib/session'
import { notifyGame } from '@/lib/sse'

// POST — admin approves or rejects a game in moderation queue
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireMod()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'forbidden') return NextResponse.json({ error }, { status: 403 })
  if (error === 'banned') return NextResponse.json({ error }, { status: 403 })

  const { id: gameId } = await params
  let action: string
  try {
    ({ action } = await req.json())
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  try {
    const result = await withTransaction(async (client) => {
      const gameRes = await client.query(
        'SELECT status FROM games WHERE id=$1', [gameId]
      )
      if (gameRes.rows[0]?.status !== 'moderation') {
        return { error: 'invalidStatus', status: 400 }
      }

      if (action === 'approve') {
        await client.query(
          "UPDATE games SET status='published', published_at=NOW() WHERE id=$1",
          [gameId]
        )
      } else {
        // reject: revert to active, clear all consents
        await client.query(
          "UPDATE games SET status='active' WHERE id=$1",
          [gameId]
        )
        await client.query(
          'DELETE FROM game_publish_consent WHERE game_id=$1',
          [gameId]
        )
      }

      return { ok: true, newStatus: action === 'approve' ? 'published' : 'active' }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    notifyGame(gameId, { _type: 'statusChanged', status: result.newStatus })
    return NextResponse.json({ ok: true, status: result.newStatus })
  } catch (error) {
    console.error('[API /api/admin/games/[id]/moderate] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
