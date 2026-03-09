import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import { query } from '@/lib/db'
import RequestCard, { Request } from '@/components/RequestCard'

export default async function BookmarksPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const requests = await query<Request>(
    `SELECT r.* FROM bookmarks b JOIN requests r ON r.id=b.request_id WHERE b.user_id=$1 ORDER BY b.created_at DESC`,
    [user.id]
  )

  return (
    <div className="max-w-[1050px] mx-auto p-[3rem_1.75rem]">
      <p className="section-label text-accent-2 mb-2">§ Закладки</p>
      <h1 className="font-heading text-[clamp(1.8rem,4vw,2.8rem)] italic font-light text-ink mb-10">
        Закладки <span className="font-mono text-[0.9rem] text-ink-2">({requests.length}/50)</span>
      </h1>

      {requests.length === 0 && (
        <p className="text-ink-2 font-heading italic text-[1.1rem]">
          Нет сохранённых заявок. Нажми ☆ рядом с заявкой, чтобы добавить.
        </p>
      )}

      <div className="grid gap-[var(--game-gap,1rem)]">
        {requests.map(r => <RequestCard key={r.id} request={r} isBookmarked />)}
      </div>
    </div>
  )
}
