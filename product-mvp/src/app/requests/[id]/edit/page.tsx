import { notFound, redirect } from 'next/navigation'
import { queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'
import RequestFormWrapper from '@/components/RequestFormWrapper'

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const request = await queryOne<{
    id: string; title: string; body: string | null; type: string; content_level: string
    fandom_type: string; pairing: string; tags: string[]; is_public: boolean; status: string; author_id: string
  }>('SELECT * FROM requests WHERE id=$1', [id])

  if (!request || request.author_id !== user.id) notFound()

  return <RequestFormWrapper mode="edit" initial={request} />
}
