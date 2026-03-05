import { NextResponse } from 'next/server'
import { getUser } from '@/lib/session'
import { query } from '@/lib/db'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ count: 0, ic_count: 0, ooc_count: 0, games: [] })

  const rows = await query<{
    id: string
    title: string | null
    ic_unread: string
    ooc_unread: string
  }>(
    `SELECT g.id, r.title,
            COUNT(CASE WHEN m.type = 'ic' THEN 1 END)::text as ic_unread,
            COUNT(CASE WHEN m.type = 'ooc' THEN 1 END)::text as ooc_unread
     FROM games g
     JOIN game_participants gp ON gp.game_id = g.id AND gp.user_id = $1 AND gp.left_at IS NULL
     LEFT JOIN requests r ON r.id = g.request_id
     JOIN messages m ON m.game_id = g.id
       AND m.participant_id != gp.id
       AND (
         (m.type = 'ic'  AND m.created_at > COALESCE(gp.last_read_at,     '-infinity'::timestamptz)) OR
         (m.type = 'ooc' AND m.created_at > COALESCE(gp.last_read_ooc_at, '-infinity'::timestamptz))
       )
     GROUP BY g.id, r.title
     HAVING COUNT(m.id) > 0
     ORDER BY MAX(m.created_at) DESC`,
    [user.id]
  )

  const icGames = rows.filter(r => parseInt(r.ic_unread) > 0)
  const oocGames = rows.filter(r => parseInt(r.ooc_unread) > 0)

  return NextResponse.json({
    count: rows.length,
    ic_count: icGames.length,
    ooc_count: oocGames.length,
    games: rows,
  })
}
