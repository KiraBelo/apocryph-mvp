import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import { query } from '@/lib/db'
import MyRequestsClient, { MyRequest } from '@/components/MyRequestsClient'
import MyRequestsHeader from '@/components/MyRequestsHeader'

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
    <div className="max-w-[1050px] mx-auto p-[3rem_1.75rem]">
      <MyRequestsHeader />
      <MyRequestsClient requests={requests} initialTab={initialTab} />
    </div>
  )
}
