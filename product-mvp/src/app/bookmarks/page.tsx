import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import { query } from '@/lib/db'
import type { Request } from '@/components/RequestCard'
import BookmarksClient from '@/components/BookmarksClient'

export interface LikedGame {
  id: string
  published_at: string
  request_title: string | null
  likes_count: string
}

export default async function BookmarksPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const requests = await query<Request & { status: string }>(
    `SELECT r.* FROM bookmarks b
     JOIN requests r ON r.id = b.request_id
     WHERE b.user_id = $1 AND r.is_public = true
     ORDER BY b.created_at DESC`,
    [user.id]
  )

  const likedGames = await query<LikedGame>(
    `SELECT g.id, g.published_at,
            r.title as request_title,
            (SELECT COUNT(*) FROM game_likes gl WHERE gl.game_id = g.id)::text as likes_count
     FROM game_likes l
     JOIN games g ON g.id = l.game_id
     LEFT JOIN requests r ON r.id = g.request_id
     WHERE l.user_id = $1
     ORDER BY l.created_at DESC`,
    [user.id]
  )

  return <BookmarksClient requests={requests} likedGames={likedGames} userId={user.id} />
}
