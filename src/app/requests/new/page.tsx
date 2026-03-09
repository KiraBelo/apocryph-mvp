import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import RequestForm from '@/components/RequestForm'

export default async function NewRequestPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '3rem 1.75rem' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '0.75rem' }}>§ Новая заявка</p>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text)', marginBottom: '2.5rem' }}>
        Создать заявку
      </h1>
      <RequestForm />
    </div>
  )
}
