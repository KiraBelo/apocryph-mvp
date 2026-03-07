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
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '3rem 1.75rem' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '0.5rem' }}>§ Закладки</p>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text)', marginBottom: '2.5rem' }}>
        Закладки <span style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem', color: 'var(--text-2)' }}>({requests.length}/50)</span>
      </h1>

      {requests.length === 0 && (
        <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.1rem' }}>
          Нет сохранённых заявок. Нажми ☆ рядом с заявкой, чтобы добавить.
        </p>
      )}

      <div style={{ display: 'grid', gap: 'var(--game-gap, 1rem)' }}>
        {requests.map(r => <RequestCard key={r.id} request={r} isBookmarked />)}
      </div>
    </div>
  )
}
