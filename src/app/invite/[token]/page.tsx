import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import { queryOne } from '@/lib/db'
import InviteClient from '@/components/InviteClient'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const user = await getUser()

  const invite = await queryOne<{ request_id: string; title: string; type: string; used_at: string | null }>(
    'SELECT i.*, r.title, r.type FROM invites i JOIN requests r ON r.id=i.request_id WHERE i.token=$1',
    [token]
  )

  if (!invite) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem', textAlign: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text)', marginBottom: '1rem' }}>Ссылка недействительна</h1>
          <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif-body)' }}>Эта инвайт-ссылка не существует или уже использована.</p>
        </div>
      </div>
    )
  }

  if (!user) redirect(`/auth/login?next=/invite/${token}`)

  return <InviteClient token={token} invite={invite} />
}
