import { NextRequest, NextResponse } from 'next/server'
import { queryOne, withTransaction } from '@/lib/db'
import { getUser } from '@/lib/session'

// GET — like count + whether current user liked
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  const { id: gameId } = await params

  try {
    const game = await queryOne<{ status: string }>(
      "SELECT status FROM games WHERE id=$1 AND status='published'",
      [gameId]
    )
    if (!game) return NextResponse.json({ error: 'notFound' }, { status: 404 })

    const countRow = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM game_likes WHERE game_id=$1',
      [gameId]
    )
    const count = parseInt(countRow?.count || '0')

    let liked = false
    if (user) {
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM game_likes WHERE game_id=$1 AND user_id=$2',
        [gameId, user.id]
      )
      liked = !!existing
    }

    return NextResponse.json({ count, liked })
  } catch (error) {
    console.error('[API /api/public-games/[id]/likes] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// POST — toggle like (authorized users only)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id: gameId } = await params

  try {
    const result = await withTransaction(async (client) => {
      const gameRes = await client.query(
        "SELECT id FROM games WHERE id=$1 AND status='published'",
        [gameId]
      )
      if (!gameRes.rows[0]) return { error: 'notFound', status: 404 }

      const existing = await client.query(
        'SELECT id FROM game_likes WHERE game_id=$1 AND user_id=$2',
        [gameId, user.id]
      )

      let liked: boolean
      if (existing.rows[0]) {
        await client.query('DELETE FROM game_likes WHERE game_id=$1 AND user_id=$2', [gameId, user.id])
        liked = false
      } else {
        await client.query(
          'INSERT INTO game_likes (game_id, user_id) VALUES ($1, $2)',
          [gameId, user.id]
        )
        liked = true
      }

      const countRes = await client.query(
        'SELECT COUNT(*) as count FROM game_likes WHERE game_id=$1', [gameId]
      )
      return { ok: true, liked, count: parseInt(countRes.rows[0].count) }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API /api/public-games/[id]/likes] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
