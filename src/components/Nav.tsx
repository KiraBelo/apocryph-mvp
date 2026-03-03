'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSettings } from './SettingsContext'

interface Props {
  user: { id: string; email: string } | null
}

export default function Nav({ user }: Props) {
  const path = usePathname()
  const { openPanel } = useSettings()

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm transition-colors hover:text-accent ${path === href ? 'text-accent' : 'text-muted'}`}
      style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}
    >
      {label}
    </Link>
  )

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: '60px', background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.75rem', transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      <Link href="/" style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontStyle: 'italic', color: 'var(--text)' }}>
        <em style={{ color: 'var(--accent)' }}>А</em>покриф
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {link('/', 'Лента')}
        {user && link('/my/requests', 'Заявки')}
        {user && link('/my/games', 'Игры')}
        {user && link('/bookmarks', 'Закладки')}

        <button
          onClick={openPanel}
          style={{
            fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.1em',
            background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)',
            padding: '0.25rem 0.65rem', cursor: 'pointer', transition: 'all 0.2s',
          }}
          title="Настройки"
        >
          ⚙
        </button>

        {user ? (
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.1em',
                background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)',
                padding: '0.25rem 0.65rem', cursor: 'pointer',
              }}
            >
              Выйти
            </button>
          </form>
        ) : (
          <Link
            href="/auth/login"
            style={{
              fontFamily: 'var(--serif)', fontSize: '0.9rem', fontStyle: 'italic',
              background: 'var(--accent)', color: '#fff',
              padding: '0.35rem 1rem', display: 'inline-block',
            }}
          >
            Войти →
          </Link>
        )}
      </div>
    </nav>
  )
}
