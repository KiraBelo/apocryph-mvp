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
    <div className="max-w-[1050px] mx-auto p-[3rem_1.75rem]">
      <div className="flex justify-between items-baseline mb-10">
        <div>
          <p className="section-label text-accent-2 mb-2">§ Мои заявки</p>
          <h1 className="font-heading text-[clamp(1.8rem,4vw,2.8rem)] italic font-light text-ink">Мои заявки</h1>
        </div>
        <Link href="/requests/new" className="btn-primary text-[0.95rem] py-[0.55rem] px-5 no-underline">
          + Создать
        </Link>
      </div>
      <MyRequestsClient requests={requests} initialTab={initialTab} />
    </div>
  )
}
