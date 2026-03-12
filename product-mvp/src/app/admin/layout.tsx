import { getUser } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    redirect('/feed')
  }
  return <>{children}</>
}
