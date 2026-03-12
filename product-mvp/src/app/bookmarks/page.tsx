import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import { query } from '@/lib/db'
import type { Request } from '@/components/RequestCard'
import BookmarksClient from '@/components/BookmarksClient'

export default async function BookmarksPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const requests = await query<Request>(
    `SELECT r.* FROM bookmarks b JOIN requests r ON r.id=b.request_id WHERE b.user_id=$1 AND r.status = 'active' AND r.is_public = true ORDER BY b.created_at DESC`,
    [user.id]
  )

  return <BookmarksClient requests={requests} />
}
