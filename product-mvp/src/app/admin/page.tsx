import { query } from '@/lib/db'
import Link from 'next/link'

export default async function AdminDashboard() {
  const [pendingReports] = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM reports WHERE status = 'pending'`
  )
  const [totalUsers] = await query<{ cnt: string }>(
    'SELECT COUNT(*) as cnt FROM users'
  )
  const [bannedUsers] = await query<{ cnt: string }>(
    'SELECT COUNT(*) as cnt FROM users WHERE banned_at IS NOT NULL'
  )
  const [hiddenGames] = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM games WHERE moderation_status != 'visible'`
  )
  const [violations7d] = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM stop_violations WHERE created_at > NOW() - INTERVAL '7 days'`
  )
  const [moderationQueue] = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM games WHERE status = 'moderation'`
  )
  const [pendingComments] = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM game_comments WHERE approved_at IS NULL`
  )

  const stats = [
    { label: 'Жалобы (ожидают)', value: pendingReports?.cnt || '0', href: '/admin/reports' },
    { label: 'На модерации', value: moderationQueue?.cnt || '0', href: '/admin/moderation' },
    { label: 'Комментарии', value: pendingComments?.cnt || '0', href: '/admin/moderation' },
    { label: 'Пользователей', value: totalUsers?.cnt || '0', href: '/admin/users' },
    { label: 'Забанено', value: bannedUsers?.cnt || '0', href: '/admin/users' },
    { label: 'Скрытых игр', value: hiddenGames?.cnt || '0', href: '/admin/reports' },
    { label: 'Нарушения (7д)', value: violations7d?.cnt || '0', href: '/admin/stop-list' },
  ]

  return (
    <div className="max-w-[900px] mx-auto py-12 px-6">
      <h1 className="page-title mb-8">Панель модерации</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="card p-6 text-center no-underline block">
            <div className="text-[2rem] font-heading text-accent">{s.value}</div>
            <div className="meta-text mt-2">{s.label}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/admin/moderation" className="btn-primary px-6 py-2 inline-block no-underline">
          Модерация
        </Link>
        <Link href="/admin/reports" className="btn-ghost px-6 py-2 inline-block no-underline">
          Жалобы
        </Link>
        <Link href="/admin/users" className="btn-ghost px-6 py-2 inline-block no-underline">
          Пользователи
        </Link>
      </div>
    </div>
  )
}
