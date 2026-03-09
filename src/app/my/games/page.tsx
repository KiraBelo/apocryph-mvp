import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import { query } from '@/lib/db'
import MyGamesClient from '@/components/MyGamesClient'

interface GameRow {
  id: string
  request_title: string | null
  created_at: string
  left_at: string | null
  my_nickname: string
  message_count: string
  active_participants: string
  last_message_user_id: string | null
  ic_unread: string
  ooc_unread: string
  starred_at: string | null
  hidden_at: string | null
  last_message_at: string | null
}

export default async function MyGamesPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const games = await query<GameRow>(
    `SELECT g.*, gp.left_at, gp.nickname as my_nickname, gp.starred_at, gp.hidden_at,
            r.title as request_title,
            (SELECT COUNT(*) FROM messages m WHERE m.game_id = g.id)::text as message_count,
            (SELECT COUNT(*) FROM game_participants gp2 WHERE gp2.game_id = g.id AND gp2.left_at IS NULL)::text as active_participants,
            (SELECT gp_last.user_id
               FROM messages m_last
               JOIN game_participants gp_last ON gp_last.id = m_last.participant_id
              WHERE m_last.game_id = g.id
              ORDER BY m_last.created_at DESC
              LIMIT 1) as last_message_user_id,
            (SELECT COUNT(*) FROM messages m
              WHERE m.game_id = g.id AND m.type = 'ic'
                AND m.participant_id != gp.id
                AND m.created_at > COALESCE(gp.last_read_at, '-infinity'::timestamptz))::text as ic_unread,
            (SELECT COUNT(*) FROM messages m
              WHERE m.game_id = g.id AND m.type = 'ooc'
                AND m.participant_id != gp.id
                AND m.created_at > COALESCE(gp.last_read_ooc_at, '-infinity'::timestamptz))::text as ooc_unread,
            (SELECT MAX(m.created_at) FROM messages m WHERE m.game_id = g.id)::text as last_message_at
     FROM games g
     JOIN game_participants gp ON gp.game_id = g.id AND gp.user_id = $1
     LEFT JOIN requests r ON r.id = g.request_id
     ORDER BY g.created_at DESC`,
    [user.id]
  )

  return <MyGamesClient games={games} userId={user.id} />
}
