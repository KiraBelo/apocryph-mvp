import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getUser } from '@/lib/session'

// GET /api/games — мои игры
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const rows = await query(
      `SELECT g.*, gp.left_at, gp.nickname as my_nickname,
              r.title as request_title,
              COALESCE(mc.message_count, 0)::text as message_count,
              COALESCE(ap.active_participants, 0)::text as active_participants
       FROM games g
       JOIN game_participants gp ON gp.game_id = g.id AND gp.user_id = $1
       LEFT JOIN requests r ON r.id = g.request_id
       LEFT JOIN (
         SELECT game_id, COUNT(*) as message_count FROM messages GROUP BY game_id
       ) mc ON mc.game_id = g.id
       LEFT JOIN (
         SELECT game_id, COUNT(*) as active_participants FROM game_participants WHERE left_at IS NULL GROUP BY game_id
       ) ap ON ap.game_id = g.id
       ORDER BY g.created_at DESC`,
      [user.id]
    )
    return NextResponse.json(rows)
  } catch (error) {
    console.error('[API /api/games] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
