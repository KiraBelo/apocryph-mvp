import { requireMod } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { error } = await requireMod()
  if (error) {
    redirect('/feed')
  }
  return <>{children}</>
}
