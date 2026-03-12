import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import RequestFormWrapper from '@/components/RequestFormWrapper'

export default async function NewRequestPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  return <RequestFormWrapper mode="new" />
}
