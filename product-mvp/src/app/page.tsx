import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import Landing from '@/components/Landing'

export default async function HomePage() {
  const user = await getUser()
  if (user) redirect('/feed')
  return <Landing />
}
