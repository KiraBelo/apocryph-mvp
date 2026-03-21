'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSettings, useT } from './SettingsContext'

interface UnreadGame { id: string; title: string | null; ic_unread: string; ooc_unread: string }
interface Proposal { id: string; title: string | null; type: 'finish' | 'publish' }

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
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [showModal, setShowModal] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const dropdownItemsRef = useRef<(HTMLAnchorElement | null)[]>([])
  const [focusedIdx, setFocusedIdx] = useState(-1)

  const icGames = unreadGames.filter(g => parseInt(g.ic_unread) > 0)
  const oocGames = unreadGames.filter(g => parseInt(g.ooc_unread) > 0)

  const fetchUnread = () =>
    fetch('/api/games/unread-count')
      .then(r => r.json())
      .then(d => { setUnreadGames(d.games ?? []); setProposals(d.proposals ?? []) })
      .catch(() => {})

  const unreadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) return

    const startPolling = () => {
      if (unreadIntervalRef.current) clearInterval(unreadIntervalRef.current)
      unreadIntervalRef.current = setInterval(fetchUnread, 5_000)
    }

    const handleVisibility = () => {
      if (document.hidden) {
        if (unreadIntervalRef.current) { clearInterval(unreadIntervalRef.current); unreadIntervalRef.current = null }
      } else {
        fetchUnread()
        startPolling()
      }
    }

    fetchUnread()
    startPolling()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (unreadIntervalRef.current) clearInterval(unreadIntervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user, path])

  useEffect(() => {
    const total = icGames.length + oocGames.length + proposals.length
    document.title = total > 0 ? `(${total}) Апокриф` : 'Апокриф'
  }, [icGames.length, oocGames.length, proposals.length])

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

  // Close notification dropdown on click outside
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [path])

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mobileOpen])

  // Dropdown keyboard navigation
  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showModal) return
    const items = dropdownItemsRef.current.filter(Boolean) as HTMLAnchorElement[]
    if (!items.length) return

    if (e.key === 'Escape') {
      e.preventDefault()
      setShowModal(false)
      setFocusedIdx(-1)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = focusedIdx < items.length - 1 ? focusedIdx + 1 : 0
      setFocusedIdx(next)
      items[next]?.focus()
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = focusedIdx > 0 ? focusedIdx - 1 : items.length - 1
      setFocusedIdx(prev)
      items[prev]?.focus()
    }
  }, [showModal, focusedIdx])

  // Reset dropdown focus index when closed
  useEffect(() => {
    if (!showModal) {
      setFocusedIdx(-1)
      dropdownItemsRef.current = []
    }
  }, [showModal])

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`link-accent transition-colors hover:text-accent ${path === href ? 'text-accent' : 'text-ink-2'}`}
    >
      {label}
    </Link>
  )

  // Collect all dropdown items for keyboard navigation
  let dropdownIdx = 0
  const dropdownRef = (el: HTMLAnchorElement | null) => {
    if (el) {
      dropdownItemsRef.current[dropdownIdx] = el
      dropdownIdx++
    }
  }

  const totalBadge = icGames.length + oocGames.length + proposals.length

  return (
    <nav className="fixed top-0 left-0 right-0 z-200 h-[60px] bg-surface border-b border-edge flex items-center justify-between px-7 transition-[background,border-color] duration-300">
      <Link href="/feed" className="font-heading text-[1.2rem] italic text-ink">
        <em className="text-accent">{t('nav.brandAccent') as string}</em>{t('nav.brand') as string}
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6">
        {link('/feed', t('nav.feed') as string)}
        {link('/library', t('nav.library') as string)}
        {user && link('/my/requests', t('nav.requests') as string)}
        {user && (
          <div className="relative flex items-center gap-1.5" ref={modalRef} onKeyDown={handleDropdownKeyDown}>
            <Link
              href="/my/games"
              className={`link-accent inline-flex items-center gap-1.5 transition-colors hover:text-accent ${path === '/my/games' ? 'text-accent' : 'text-ink-2'}`}
            >
              {t('nav.games') as string}
            </Link>
            {icGames.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setShowModal(v => !v) }}
                aria-expanded={showModal}
                aria-label={t('nav.notifications') as string}
                className="font-mono text-[0.58rem] tracking-[0.02em] bg-accent text-white rounded-full w-[1.35rem] h-[1.35rem] inline-flex items-center justify-center leading-none border-none cursor-pointer"
              >
                {icGames.length}
              </button>
            )}
            {oocGames.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setShowModal(v => !v) }}
                aria-expanded={showModal}
                aria-label={t('nav.notifications') as string}
                className="font-mono text-[0.55rem] tracking-[0.02em] bg-ink-2 text-surface rounded-full w-[1.35rem] h-[1.35rem] inline-flex items-center justify-center leading-none border-none cursor-pointer"
              >
                {oocGames.length}
              </button>
            )}
            {proposals.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setShowModal(v => !v) }}
                aria-expanded={showModal}
                aria-label={t('nav.notifications') as string}
                className="font-mono text-[0.55rem] tracking-[0.02em] rounded-full w-[1.35rem] h-[1.35rem] inline-flex items-center justify-center leading-none border-none cursor-pointer"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                {proposals.length}
              </button>
            )}

            {showModal && (
              <div role="menu" className="absolute top-[calc(100%+0.75rem)] right-0 bg-surface border border-edge min-w-[260px] z-300 shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
                {icGames.length > 0 && (
                  <>
                    <p className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-accent px-4 pt-3 pb-2 border-b border-edge">
                      {t('nav.newPosts') as string}
                    </p>
                    {icGames.map(g => (
                      <Link
                        key={g.id}
                        href={`/games/${g.id}`}
                        ref={dropdownRef}
                        role="menuitem"
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
                        ref={dropdownRef}
                        role="menuitem"
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
                {proposals.length > 0 && (
                  <>
                    <p className="font-mono text-[0.6rem] tracking-[0.15em] uppercase px-4 pt-3 pb-2 border-b border-edge" style={{ color: 'var(--accent)' }}>
                      {t('nav.proposals') as string}
                    </p>
                    {proposals.map(p => (
                      <Link
                        key={`prop-${p.type}-${p.id}`}
                        href={`/games/${p.id}`}
                        ref={dropdownRef}
                        role="menuitem"
                        onClick={() => setShowModal(false)}
                        className="block py-[0.7rem] px-4 no-underline border-b border-edge transition-[background,padding-left] duration-150 hover:bg-surface-2 hover:pl-5"
                        style={{ borderLeft: '3px solid var(--accent-dim)' }}
                      >
                        <span className="font-heading text-[0.95rem] italic text-ink">
                          {p.title ? truncate(p.title) : t('nav.untitled') as string}
                        </span>
                        <span className="block font-mono text-[0.55rem] tracking-[0.08em] text-ink-2 mt-0.5">
                          {p.type === 'finish' ? t('nav.proposalFinish') as string : t('nav.proposalPublish') as string}
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
          aria-label={t('nav.settings') as string}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        {user ? (
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="bg-transparent border-none text-ink-2 p-[0.2rem] cursor-pointer flex items-center"
              aria-label={t('nav.logout') as string}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

      {/* Mobile: badges + hamburger */}
      <div className="flex md:hidden items-center gap-3">
        {user && totalBadge > 0 && (
          <Link href="/my/games" className="font-mono text-[0.58rem] tracking-[0.02em] bg-accent text-white rounded-full w-[1.35rem] h-[1.35rem] inline-flex items-center justify-center leading-none no-underline">
            {totalBadge > 9 ? '9+' : totalBadge}
          </Link>
        )}
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="bg-transparent border-none text-ink p-1 cursor-pointer flex items-center justify-center w-[44px] h-[44px]"
          aria-label={mobileOpen ? t('nav.closeMenu') as string : t('nav.openMenu') as string}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="mobile-nav-overlay md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-in menu */}
      <div className={`mobile-nav-menu md:hidden ${mobileOpen ? 'mobile-nav-menu--open' : ''}`}>
        <div className="flex flex-col gap-5 p-6 pt-4">
          {link('/feed', t('nav.feed') as string)}
          {link('/library', t('nav.library') as string)}
          {user && link('/my/requests', t('nav.requests') as string)}
          {user && (
            <div className="flex items-center gap-2">
              {link('/my/games', t('nav.games') as string)}
              {totalBadge > 0 && (
                <span className="font-mono text-[0.55rem] bg-accent text-white rounded-full w-[1.2rem] h-[1.2rem] inline-flex items-center justify-center leading-none">
                  {totalBadge > 9 ? '9+' : totalBadge}
                </span>
              )}
            </div>
          )}
          {user && link('/bookmarks', t('nav.bookmarks') as string)}
          {user && (user.role === 'admin' || user.role === 'moderator') && link('/admin', t('nav.admin') as string)}

          <div className="border-t border-edge pt-4 flex items-center gap-4">
            <button
              onClick={() => { openPanel(); setMobileOpen(false) }}
              className="bg-transparent border-none text-ink-2 p-[0.2rem] cursor-pointer flex items-center"
              aria-label={t('nav.settings') as string}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            {user ? (
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="bg-transparent border-none text-ink-2 p-[0.2rem] cursor-pointer flex items-center"
                  aria-label={t('nav.logout') as string}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/>
                    <path d="M17 8l4 4-4 4"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </form>
            ) : (
              <Link href="/auth/login" className="btn-primary text-[0.9rem] py-1.5 px-4 inline-block" onClick={() => setMobileOpen(false)}>
                {t('nav.login') as string}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
