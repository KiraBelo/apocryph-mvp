import { notFound, redirect } from 'next/navigation'
import { queryOne, query } from '@/lib/db'
import { getUser } from '@/lib/session'
import RequestDetailClient from '@/components/RequestDetailClient'

interface Request {
  id: string; title: string; body: string | null; type: string; content_level: string
  fandom_type: string; pairing: string; tags: string[]; status: string; author_id: string; is_public: boolean; created_at: string
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()

  const request = await queryOne<Request>('SELECT * FROM requests WHERE id=$1', [id])
  if (!request) notFound()
  if (!request.is_public && user?.id !== request.author_id) notFound()

  const isAuthor = user?.id === request.author_id

  const bookmarks = user
    ? await query<{ request_id: string }>('SELECT request_id FROM bookmarks WHERE user_id=$1 AND request_id=$2', [user.id, id])
    : []

  const existingGame = user
    ? await queryOne<{ id: string }>(
        `SELECT g.id FROM games g
         JOIN game_participants gp ON gp.game_id = g.id AND gp.user_id = $1 AND gp.left_at IS NULL
         WHERE g.request_id = $2
         LIMIT 1`,
        [user.id, id]
      )
    : null

  return (
    <RequestDetailClient
      request={request}
      user={user}
      isAuthor={isAuthor}
      isBookmarked={bookmarks.length > 0}
      existingGameId={existingGame?.id ?? null}
    />
  )
}
