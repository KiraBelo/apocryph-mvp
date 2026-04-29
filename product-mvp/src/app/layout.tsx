import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Cormorant_Garamond, Courier_Prime } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import BanBanner from '@/components/BanBanner'
import { SettingsProvider } from '@/components/SettingsContext'
import SettingsPanel from '@/components/SettingsPanel'
import ToastProvider from '@/components/ToastProvider'
import { getUser } from '@/lib/session'
import { queryOne } from '@/lib/db'
import { buildFontsBootstrapScript } from '@/lib/font-bootstrap'

const cormorantGaramond = Cormorant_Garamond({
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-courier-prime',
  display: 'swap',
})

const fontsBootstrap = buildFontsBootstrapScript()

export const metadata: Metadata = {
  title: 'Апокриф — анонимные текстовые ролевые игры',
  description: 'Найди соигрока. Отыграй историю. Оставь реал в офлайне.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  const nonce = (await headers()).get('x-nonce') ?? undefined

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

  // FOUC fix (audit-v4 medium): apply the saved theme before the first
  // paint, so a user with `nocturne` saved doesn't see a flash of the
  // default `light` palette while React boots. The script runs
  // synchronously in <head>, before any styled content is rendered.
  // Mirror the validation from ThemeProvider so saved values stay
  // honoured across both paths.
  const themeBootstrap = `
(function(){try{var t=localStorage.getItem('apocryph-theme');if(t&&['light','sepia','ink','nocturne'].indexOf(t)!==-1){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
`
  return (
    <html
      lang="ru"
      data-theme="light"
      suppressHydrationWarning
      className={`${cormorantGaramond.variable} ${courierPrime.variable}`}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: fontsBootstrap }} />
      </head>
      <body>
        <SettingsProvider>
          <ToastProvider>
            <Nav user={user} />
            {isBanned && <BanBanner reason={banReason} />}
            <SettingsPanel />
            <main className="min-h-screen pt-[60px]">
              {children}
            </main>
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
