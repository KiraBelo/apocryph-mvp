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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Merriweather:ital,wght@0,300;0,400;1,300;1,400&family=Crimson+Pro:ital,wght@0,400;0,500;1,400&family=Caveat:wght@400;500&family=Raleway:ital,wght@0,300;0,400;1,300;1,400&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=PT+Sans:ital,wght@0,400;0,700;1,400&family=PT+Mono:wght@400&family=Neucha&family=Marck+Script&family=Montserrat:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Roboto:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Open+Sans:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Nunito:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap" rel="stylesheet" />
      </head>
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
