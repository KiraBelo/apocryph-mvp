'use client'
import Link from 'next/link'
import { useT } from './SettingsContext'

interface Stats {
  pendingReports: string
  moderationQueue: string
  pendingComments: string
  totalUsers: string
  bannedUsers: string
  hiddenGames: string
  violations7d: string
}

export default function AdminDashboardClient({ stats }: { stats: Stats }) {
  const t = useT()

  const cards = [
    { labelKey: 'admin.dashReports', value: stats.pendingReports, href: '/admin/reports' },
    { labelKey: 'admin.dashModeration', value: stats.moderationQueue, href: '/admin/moderation' },
    { labelKey: 'admin.dashComments', value: stats.pendingComments, href: '/admin/moderation' },
    { labelKey: 'admin.dashUsers', value: stats.totalUsers, href: '/admin/users' },
    { labelKey: 'admin.dashBanned', value: stats.bannedUsers, href: '/admin/users' },
    { labelKey: 'admin.dashHidden', value: stats.hiddenGames, href: '/admin/reports' },
    { labelKey: 'admin.dashViolations', value: stats.violations7d, href: '/admin/stop-list' },
  ]

  return (
    <div className="max-w-[900px] mx-auto py-8 px-6">
      <h1 className="page-title mb-5">{t('admin.dashboard') as string}</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(c => (
          <Link key={c.labelKey} href={c.href} className="card p-6 text-center no-underline block">
            <div className="text-[2rem] font-heading text-accent">{c.value}</div>
            <div className="meta-text mt-2">{t(c.labelKey) as string}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex gap-4 flex-wrap">
        <Link href="/admin/moderation" className="btn-primary px-6 py-2 inline-block no-underline">
          {t('admin.moderation') as string}
        </Link>
        <Link href="/admin/reports" className="btn-ghost px-6 py-2 inline-block no-underline">
          {t('admin.reports') as string}
        </Link>
        <Link href="/admin/users" className="btn-ghost px-6 py-2 inline-block no-underline">
          {t('admin.users') as string}
        </Link>
      </div>
    </div>
  )
}
