'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSettings, useT } from './SettingsContext'

interface UnreadGame { id: string; title: string | null; ic_unread: string; ooc_unread: string }

interface Props {
  user: { id: string; email: string; role?: string } | null
}

function truncate(str: string, words = 6) {
  const parts = str.trim().split(/\s+/)
  return parts.length <= words ? str : parts.slice(0, words).join(' ') + '…'
}

export default function Nav({ user }: Props) {
  const path = usePathname()
  const { openPanel } = useSettings()
  const t = useT()
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

  useEffect(() => {
    const total = icGames.length + oocGames.length
    document.title = total > 0 ? `(${total}) Апокриф` : 'Апокриф'
  }, [icGames.length, oocGames.length])

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
      className={`link-accent transition-colors hover:text-accent ${path === href ? 'text-accent' : 'text-ink-2'}`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="fixed top-0 left-0 right-0 z-200 h-[60px] bg-surface border-b border-edge flex items-center justify-between px-7 transition-[background,border-color] duration-300">
      <Link href="/feed" className="font-heading text-[1.2rem] italic text-ink">
        <em className="text-accent">{t('nav.brandAccent') as string}</em>{t('nav.brand') as string}
      </Link>

      <div className="flex items-center gap-6">
        {link('/feed', t('nav.feed') as string)}
        {user && link('/my/requests', t('nav.requests') as string)}
        {user && (
          <div className="relative flex items-center gap-1.5" ref={modalRef}>
            <Link
              href="/my/games"
              className={`link-accent inline-flex items-center gap-1.5 transition-colors hover:text-accent ${path === '/my/games' ? 'text-accent' : 'text-ink-2'}`}
            >
              {t('nav.games') as string}
            </Link>
            {icGames.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setShowModal(v => !v) }}
                className="font-mono text-[0.58rem] tracking-[0.02em] bg-accent text-white rounded-full w-[1.35rem] h-[1.35rem] inline-flex items-center justify-center leading-none border-none cursor-pointer"
              >
                {icGames.length}
              </button>
            )}
            {oocGames.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setShowModal(v => !v) }}
                className="font-mono text-[0.55rem] tracking-[0.02em] bg-ink-2 text-surface rounded-full w-[1.35rem] h-[1.35rem] inline-flex items-center justify-center leading-none border-none cursor-pointer"
              >
                {oocGames.length}
              </button>
            )}

            {showModal && (
              <div className="absolute top-[calc(100%+0.75rem)] right-0 bg-surface border border-edge min-w-[260px] z-300 shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
                {icGames.length > 0 && (
                  <>
                    <p className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-accent px-4 pt-3 pb-2 border-b border-edge">
                      {t('nav.newPosts') as string}
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
                        className="block py-[0.7rem] px-4 no-underline border-b border-edge border-l-3 border-l-accent transition-[background,padding-left] duration-150 hover:bg-surface-2 hover:pl-5"
                      >
                        <span className="font-heading text-[0.95rem] italic text-ink">
                          {g.title ? truncate(g.title) : t('nav.untitled') as string}
                        </span>
                      </Link>
                    ))}
                  </>
                )}
                {oocGames.length > 0 && (
                  <>
                    <p className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-2 px-4 pt-3 pb-2 border-b border-edge">
                      {t('nav.offtop') as string}
                    </p>
                    {oocGames.map(g => (
                      <Link
                        key={`ooc-${g.id}`}
                        href={`/games/${g.id}?tab=ooc`}
                        onClick={() => {
                          setShowModal(false)
                          setUnreadGames(prev => prev.map(x => x.id === g.id ? { ...x, ooc_unread: '0' } : x).filter(x => parseInt(x.ic_unread) > 0 || parseInt(x.ooc_unread) > 0))
                          fetch(`/api/games/${g.id}/read`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tab: 'ooc' }),
                          })
                        }}
                        className="block py-[0.7rem] px-4 no-underline border-b border-edge border-l-3 border-l-ink-2 transition-[background,padding-left] duration-150 hover:bg-surface-2 hover:pl-5"
                      >
                        <span className="font-mono text-[0.85rem] text-ink-2">
                          {g.title ? truncate(g.title) : t('nav.untitled') as string}
                        </span>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {user && link('/bookmarks', t('nav.bookmarks') as string)}
        {user && (user.role === 'admin' || user.role === 'moderator') && link('/admin', t('nav.admin') as string)}

        <button
          onClick={openPanel}
          className="bg-transparent border-none text-ink-2 p-[0.2rem] cursor-pointer flex items-center"
          title={t('nav.settings') as string}
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
              className="bg-transparent border-none text-ink-2 p-[0.2rem] cursor-pointer flex items-center"
              title={t('nav.logout') as string}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/>
                <path d="M17 8l4 4-4 4"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </form>
        ) : (
          <Link href="/auth/login" className="btn-primary text-[0.9rem] py-1.5 px-4 inline-block">
            {t('nav.login') as string}
          </Link>
        )}
      </div>
    </nav>
  )
}
