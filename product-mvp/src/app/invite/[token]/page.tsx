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
      <div className="flex items-center justify-center min-h-[80vh] p-8 text-center">
        <div>
          <h1 className="font-heading text-[2rem] italic text-ink mb-4">Ссылка недействительна</h1>
          <p className="text-ink-2 font-body">Эта инвайт-ссылка не существует или уже использована.</p>
        </div>
      </div>
    )
  }

  if (!user) redirect(`/auth/login?next=/invite/${token}`)

  return <InviteClient token={token} invite={invite} />
}
