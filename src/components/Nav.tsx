'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSettings } from './SettingsContext'

interface UnreadGame { id: string; title: string | null; ic_unread: string; ooc_unread: string }

interface Props {
  user: { id: string; email: string } | null
}

function truncate(str: string, words = 6) {
  const parts = str.trim().split(/\s+/)
  return parts.length <= words ? str : parts.slice(0, words).join(' ') + '…'
}

export default function Nav({ user }: Props) {
  const path = usePathname()
  const { openPanel } = useSettings()
  const [unreadGames, setUnreadGames] = useState<UnreadGame[]>([])
  const [showModal, setShowModal] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const icGames = unreadGames.filter(g => parseInt(g.ic_unread) > 0)
  const oocGames = unreadGames.filter(g => parseInt(g.ooc_unread) > 0)

  const fetchUnread = () =>
    fetch('/api/games/unread-count')
      .then(r => r.json())
      .then(d => setUnreadGames(d.games ?? []))

  useEffect(() => {
    if (!user) return
    fetchUnread()
    const interval = setInterval(fetchUnread, 5_000)
    return () => clearInterval(interval)
  }, [user, path])

  // Заголовок вкладки с количеством непрочитанных
  useEffect(() => {
    const total = icGames.length + oocGames.length
    document.title = total > 0 ? `(${total}) Апокриф` : 'Апокриф'
  }, [icGames.length, oocGames.length])

  // Фавикон с бейджем непрочитанных
  useEffect(() => {
    const total = icGames.length + oocGames.length

    const getLink = (): HTMLLinkElement => {
      let el = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
      if (!el) {
        el = document.createElement('link')
        el.rel = 'icon'
        document.head.appendChild(el)
      }
      return el
    }

    if (total === 0) {
      getLink().href = '/favicon.ico'
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const badgeColor = icGames.length > 0 ? '#7d2c3e' : '#888888'
    const label = total > 9 ? '9+' : String(total)

    const drawBadge = () => {
      ctx.beginPath()
      ctx.arc(23, 9, 9, 0, Math.PI * 2)
      ctx.fillStyle = badgeColor
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${label.length > 1 ? '8' : '11'}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, 23, 9)
      getLink().href = canvas.toDataURL('image/png')
    }

    const img = new Image()
    img.src = '/favicon.ico'
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32)
      drawBadge()
    }
    img.onerror = () => {
      ctx.clearRect(0, 0, 32, 32)
      drawBadge()
    }
  }, [icGames.length, oocGames.length])

  // Закрытие по клику вне модалки
  useEffect(() => {
    if (!showModal) return
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showModal])

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
        {user && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.4rem' }} ref={modalRef}>
            <Link
              href="/my/games"
              className={`text-sm transition-colors hover:text-accent ${path === '/my/games' ? 'text-accent' : 'text-muted'}`}
              style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Игры
            </Link>
            {icGames.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setShowModal(v => !v) }}
                style={{
                  fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: '0.02em',
                  background: 'var(--accent)', color: '#fff',
                  borderRadius: '999px', width: '1.35rem', height: '1.35rem',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1, border: 'none', cursor: 'pointer',
                }}
              >
                {icGames.length}
              </button>
            )}
            {oocGames.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setShowModal(v => !v) }}
                style={{
                  fontFamily: 'var(--mono)', fontSize: '0.55rem', letterSpacing: '0.02em',
                  background: 'var(--text-2)', color: 'var(--bg)',
                  borderRadius: '999px', width: '1.35rem', height: '1.35rem',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1, border: 'none', cursor: 'pointer',
                }}
              >
                {oocGames.length}
              </button>
            )}

            {showModal && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.75rem)', right: 0,
                background: 'var(--bg)', border: '1px solid var(--border)',
                minWidth: '260px', zIndex: 300,
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              }}>
                {icGames.length > 0 && (
                  <>
                    <p style={{
                      fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.15em',
                      textTransform: 'uppercase', color: 'var(--accent)',
                      padding: '0.75rem 1rem 0.5rem', borderBottom: '1px solid var(--border)',
                    }}>
                      Новые посты
                    </p>
                    {icGames.map(g => (
                      <Link
                        key={g.id}
                        href={`/games/${g.id}`}
                        onClick={() => {
                          setShowModal(false)
                          setUnreadGames(prev => prev.map(x => x.id === g.id ? { ...x, ic_unread: '0' } : x).filter(x => parseInt(x.ic_unread) > 0 || parseInt(x.ooc_unread) > 0))
                          fetch(`/api/games/${g.id}/read`, { method: 'POST' })
                        }}
                        style={{
                          display: 'block', padding: '0.7rem 1rem',
                          textDecoration: 'none', borderBottom: '1px solid var(--border)',
                          borderLeft: '3px solid var(--accent)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text)' }}>
                          {g.title ? truncate(g.title) : 'Без названия'}
                        </span>
                      </Link>
                    ))}
                  </>
                )}
                {oocGames.length > 0 && (
                  <>
                    <p style={{
                      fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.15em',
                      textTransform: 'uppercase', color: 'var(--text-2)',
                      padding: '0.75rem 1rem 0.5rem', borderBottom: '1px solid var(--border)',
                    }}>
                      Оффтоп
                    </p>
                    {oocGames.map(g => (
                      <Link
                        key={`ooc-${g.id}`}
                        href={`/games/${g.id}`}
                        onClick={() => {
                          setShowModal(false)
                          setUnreadGames(prev => prev.map(x => x.id === g.id ? { ...x, ooc_unread: '0' } : x).filter(x => parseInt(x.ic_unread) > 0 || parseInt(x.ooc_unread) > 0))
                          fetch(`/api/games/${g.id}/read`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tab: 'ooc' }),
                          })
                        }}
                        style={{
                          display: 'block', padding: '0.7rem 1rem',
                          textDecoration: 'none', borderBottom: '1px solid var(--border)',
                          borderLeft: '3px solid var(--text-2)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--text-2)' }}>
                          {g.title ? truncate(g.title) : 'Без названия'}
                        </span>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {user && link('/bookmarks', 'Закладки')}

        <button
          onClick={openPanel}
          style={{ background: 'none', border: 'none', color: 'var(--text-2)', padding: '0.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="Настройки"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        {user ? (
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{ background: 'none', border: 'none', color: 'var(--text-2)', padding: '0.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Выйти"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/>
                <path d="M17 8l4 4-4 4"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
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
