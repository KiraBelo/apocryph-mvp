import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import BanBanner from '@/components/BanBanner'
import { SettingsProvider } from '@/components/SettingsContext'
import SettingsPanel from '@/components/SettingsPanel'
import { getUser } from '@/lib/session'
import { queryOne } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Апокриф — анонимные текстовые ролевые игры',
  description: 'Найди соигрока. Отыграй историю. Оставь реал в офлайне.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  // Check ban status for logged-in users
  let banReason: string | null = null
  let isBanned = false
  if (user) {
    const row = await queryOne<{ banned_at: string | null; ban_reason: string | null }>(
      'SELECT banned_at, ban_reason FROM users WHERE id = $1', [user.id]
    )
    if (row?.banned_at) {
      isBanned = true
      banReason = row.ban_reason
    }
  }

  return (
    <html lang="ru" data-theme="light" suppressHydrationWarning>
      <body>
        <SettingsProvider>
          <Nav user={user} />
          {isBanned && <BanBanner reason={banReason} />}
          <SettingsPanel />
          <main className="min-h-screen pt-[60px]">
            {children}
          </main>
        </SettingsProvider>
      </body>
    </html>
  )
}
