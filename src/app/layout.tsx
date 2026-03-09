import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import { SettingsProvider } from '@/components/SettingsContext'
import SettingsPanel from '@/components/SettingsPanel'
import { getUser } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Апокриф — анонимные текстовые ролевые игры',
  description: 'Найди соигрока. Отыграй историю. Оставь реал в офлайне.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  return (
    <html lang="ru" data-theme="light" suppressHydrationWarning>
      <body>
        <SettingsProvider>
          <Nav user={user} />
          <SettingsPanel />
          <main className="min-h-screen pt-[60px]">
            {children}
          </main>
        </SettingsProvider>
      </body>
    </html>
  )
}
