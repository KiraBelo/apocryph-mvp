import { query } from '@/lib/db'
import Link from 'next/link'
import AdminModerationClient from '@/components/AdminModeration'

interface GameRow {
  id: string
  request_title: string | null
  created_at: string
  published_at: string | null
  ic_count: string
  participants: string
}

interface CommentRow {
  id: string
  content: string
  created_at: string
  game_id: string
  request_title: string | null
  is_author_reply: boolean
  parent_content: string | null
}

export default async function AdminModerationPage() {
  const games = await query<GameRow>(
    `SELECT g.id, r.title as request_title, g.created_at, g.published_at,
            (SELECT COUNT(*) FROM messages m WHERE m.game_id = g.id AND m.type='ic')::text as ic_count,
            (SELECT json_agg(json_build_object('nickname', gp.nickname))
              FROM game_participants gp WHERE gp.game_id = g.id)::text as participants
     FROM games g
     LEFT JOIN requests r ON r.id = g.request_id
     WHERE g.status = 'moderation'
     ORDER BY g.created_at ASC`
  )

  const comments = await query<CommentRow>(
    `SELECT gc.id, gc.content, gc.created_at, gc.game_id,
            r.title as request_title,
            gc.parent_id IS NOT NULL as is_author_reply,
            (SELECT pc.content FROM game_comments pc WHERE pc.id = gc.parent_id) as parent_content
     FROM game_comments gc
     JOIN games g ON g.id = gc.game_id
     LEFT JOIN requests r ON r.id = g.request_id
     WHERE gc.approved_at IS NULL
     ORDER BY gc.created_at ASC`
  )

  const safeGames = games.map(g => ({
    ...g,
    participants: g.participants ? JSON.parse(g.participants) : [],
  }))

  return <AdminModerationClient games={safeGames} comments={comments} />
}
