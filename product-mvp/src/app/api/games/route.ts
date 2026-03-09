import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getUser } from '@/lib/session'

// GET /api/games — мои игры
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const rows = await query(
    `SELECT g.*, gp.left_at, gp.nickname as my_nickname,
            r.title as request_title,
            (SELECT COUNT(*) FROM messages m WHERE m.game_id = g.id) as message_count,
            (SELECT COUNT(*) FROM game_participants gp2 WHERE gp2.game_id = g.id AND gp2.left_at IS NULL) as active_participants
     FROM games g
     JOIN game_participants gp ON gp.game_id = g.id AND gp.user_id = $1
     LEFT JOIN requests r ON r.id = g.request_id
     ORDER BY g.created_at DESC`,
    [user.id]
  )
  return NextResponse.json(rows)
}
