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
    tags: string[]; is_public: boolean; status: string; author_id: string
  }>('SELECT * FROM requests WHERE id=$1', [id])

  if (!request || request.author_id !== user.id) notFound()

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '3rem 1.75rem' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '0.75rem' }}>§ Редактирование</p>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text)', marginBottom: '2.5rem' }}>
        Изменить заявку
      </h1>
      <RequestForm initial={request} />
    </div>
  )
}
