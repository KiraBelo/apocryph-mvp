import { query } from '@/lib/db'
import AdminDashboardClient from '@/components/AdminDashboardClient'

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

  return <AdminDashboardClient stats={{
    pendingReports: pendingReports?.cnt || '0',
    moderationQueue: moderationQueue?.cnt || '0',
    pendingComments: pendingComments?.cnt || '0',
    totalUsers: totalUsers?.cnt || '0',
    bannedUsers: bannedUsers?.cnt || '0',
    hiddenGames: hiddenGames?.cnt || '0',
    violations7d: violations7d?.cnt || '0',
  }} />
}
