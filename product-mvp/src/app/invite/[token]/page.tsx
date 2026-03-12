import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import { queryOne } from '@/lib/db'
import InviteClient from '@/components/InviteClient'
import InvalidInviteClient from '@/components/InvalidInviteClient'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const user = await getUser()

  const invite = await queryOne<{ request_id: string; title: string; type: string; used_at: string | null }>(
    'SELECT i.*, r.title, r.type FROM invites i JOIN requests r ON r.id=i.request_id WHERE i.token=$1',
    [token]
  )

  if (!invite || invite.used_at) {
    return <InvalidInviteClient />
  }

  if (!user) redirect(`/auth/login?next=/invite/${token}`)

  return <InviteClient token={token} invite={invite} />
}
