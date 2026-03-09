import { notFound, redirect } from 'next/navigation'
import { queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'
import RequestForm from '@/components/RequestForm'

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const request = await queryOne<{
    id: string; title: string; body: string | null; type: string; content_level: string
    fandom_type: string; pairing: string; tags: string[]; is_public: boolean; status: string; author_id: string
  }>('SELECT * FROM requests WHERE id=$1', [id])

  if (!request || request.author_id !== user.id) notFound()

  return (
    <div className="max-w-[1050px] mx-auto p-[3rem_1.75rem]">
      <p className="section-label text-accent-2 mb-3">§ Редактирование</p>
      <h3 className="font-heading text-[clamp(1.8rem,4vw,2.8rem)] italic font-light text-ink mb-10">
        Изменить заявку
      </h3>
      <RequestForm initial={request} />
    </div>
  )
}
