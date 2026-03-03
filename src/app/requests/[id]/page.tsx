import { notFound, redirect } from 'next/navigation'
import { queryOne, query } from '@/lib/db'
import { getUser } from '@/lib/session'
import RequestDetailClient from '@/components/RequestDetailClient'

interface Request {
  id: string; title: string; body: string | null; type: string; content_level: string
  tags: string[]; status: string; author_id: string; is_public: boolean; created_at: string
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()

  const request = await queryOne<Request>('SELECT * FROM requests WHERE id=$1', [id])
  if (!request) notFound()

  const isAuthor = user?.id === request.author_id

  const bookmarks = user
    ? await query<{ request_id: string }>('SELECT request_id FROM bookmarks WHERE user_id=$1 AND request_id=$2', [user.id, id])
    : []

  return (
    <RequestDetailClient
      request={request}
      user={user}
      isAuthor={isAuthor}
      isBookmarked={bookmarks.length > 0}
    />
  )
}
