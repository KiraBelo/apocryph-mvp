import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import { query } from '@/lib/db'
import Link from 'next/link'
import MyRequestsClient, { MyRequest } from '@/components/MyRequestsClient'

export default async function MyRequestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const { tab } = await searchParams
  const validTabs = ['all', 'active', 'draft', 'inactive'] as const
  const initialTab = validTabs.find(t => t === tab) ?? 'active'

  const requests = await query<MyRequest>(
    `SELECT * FROM requests WHERE author_id=$1 ORDER BY created_at DESC`,
    [user.id]
  )

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2.5rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '0.5rem' }}>§ Мои заявки</p>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text)' }}>Мои заявки</h1>
        </div>
        <Link href="/requests/new" style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.95rem', background: 'var(--accent)', color: '#fff', padding: '0.55rem 1.25rem' }}>
          + Создать
        </Link>
      </div>
      <MyRequestsClient requests={requests} initialTab={initialTab} />
    </div>
  )
}
