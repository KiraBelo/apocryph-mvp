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
  ooc_enabled: boolean
  request_body: string | null
  request_tags: string[] | null
  request_type: string | null
  request_fandom_type: string | null
  request_pairing: string | null
  request_content_level: string | null
  status: string
  published_at: string | null
  partner_publish_consent: boolean
}

export default async function MyGamesPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const games = await query<GameRow>(
    `WITH my_games AS (
       SELECT g.id as game_id, gp.id as participant_id,
              gp.left_at, gp.nickname, gp.starred_at, gp.hidden_at,
              gp.last_read_at, gp.last_read_ooc_at
         FROM games g
         JOIN game_participants gp ON gp.game_id = g.id AND gp.user_id = $1
     ),
     game_stats AS (
       SELECT m.game_id,
              COUNT(*)::text as message_count,
              MAX(m.created_at)::text as last_message_at
         FROM messages m
         JOIN my_games mg ON mg.game_id = m.game_id
        GROUP BY m.game_id
     ),
     last_msg AS (
       SELECT DISTINCT ON (m.game_id)
              m.game_id,
              gp_last.user_id as last_message_user_id
         FROM messages m
         JOIN my_games mg ON mg.game_id = m.game_id
         JOIN game_participants gp_last ON gp_last.id = m.participant_id
        ORDER BY m.game_id, m.created_at DESC
     ),
     active_parts AS (
       SELECT gp2.game_id,
              COUNT(*)::text as active_participants
         FROM game_participants gp2
         JOIN my_games mg ON mg.game_id = gp2.game_id
        WHERE gp2.left_at IS NULL
        GROUP BY gp2.game_id
     ),
     unread_stats AS (
       SELECT m.game_id,
              COUNT(*) FILTER (WHERE m.type = 'ic'
                AND m.created_at > COALESCE(mg.last_read_at, '-infinity'::timestamptz))::text as ic_unread,
              COUNT(*) FILTER (WHERE m.type = 'ooc'
                AND m.created_at > COALESCE(mg.last_read_ooc_at, '-infinity'::timestamptz))::text as ooc_unread
         FROM messages m
         JOIN my_games mg ON mg.game_id = m.game_id AND m.participant_id != mg.participant_id
        GROUP BY m.game_id
     ),
     partner_consent AS (
       SELECT c.game_id
         FROM game_publish_consent c
         JOIN game_participants gp4 ON gp4.id = c.participant_id
        WHERE gp4.user_id != $1
     )
     SELECT g.*, mg.left_at, mg.nickname as my_nickname, mg.starred_at, mg.hidden_at,
            r.title as request_title,
            r.body as request_body,
            r.tags as request_tags,
            r.type as request_type,
            r.fandom_type as request_fandom_type,
            r.pairing as request_pairing,
            r.content_level as request_content_level,
            COALESCE(gs.message_count, '0') as message_count,
            COALESCE(ap.active_participants, '0') as active_participants,
            lm.last_message_user_id,
            COALESCE(us.ic_unread, '0') as ic_unread,
            COALESCE(us.ooc_unread, '0') as ooc_unread,
            gs.last_message_at,
            COALESCE(pc.game_id IS NOT NULL, false) as partner_publish_consent
       FROM games g
       JOIN my_games mg ON mg.game_id = g.id
       LEFT JOIN requests r ON r.id = g.request_id
       LEFT JOIN game_stats gs ON gs.game_id = g.id
       LEFT JOIN last_msg lm ON lm.game_id = g.id
       LEFT JOIN active_parts ap ON ap.game_id = g.id
       LEFT JOIN unread_stats us ON us.game_id = g.id
       LEFT JOIN partner_consent pc ON pc.game_id = g.id
      ORDER BY g.created_at DESC`,
    [user.id]
  )

  return <MyGamesClient games={games} userId={user.id} />
}
