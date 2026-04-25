'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useT, usePlural } from './SettingsContext'
import { useToast } from './ToastProvider'
import { Star, X } from 'lucide-react'
import Breadcrumbs from './Breadcrumbs'

interface GameRow {
  id: string
  request_title: string | null
  created_at: string
  left_at: string | null
  my_nickname: string
  message_count: string
  active_participants: string
  last_message_is_mine: boolean
  ic_unread: string
  ooc_unread: string
  starred_at: string | null
  hidden_at: string | null
  last_message_at: string | null
  ooc_enabled: boolean
  request_body: string | null
  request_tags: string[] | null
  request_type: string | null
  request_fandom_type: string | null
  request_pairing: string | null
  request_content_level: string | null
  status: string
  published_at: string | null
  partner_publish_consent: boolean
}

interface Props {
  games: GameRow[]
}

type MainTab = 'active' | 'inactive' | 'starred' | 'published'

export default function MyGamesClient({ games: initialGames }: Props) {
  const t = useT()
  const tPlural = usePlural()
  const { addToast } = useToast()
  const router = useRouter()
  const [games, setGames] = useState(initialGames)
  const [mainTab, setMainTab] = useState<MainTab>('active')
  const [subTab, setSubTab] = useState<'waiting-them' | 'waiting-me'>('waiting-me')

  const typeLabels: Record<string, string> = { duo: t('filters.duo') as string, multiplayer: t('filters.multiplayer') as string }
  const fandomTypeLabels: Record<string, string> = { fandom: t('filters.fandom') as string, original: t('filters.original') as string }
  const pairingLabels: Record<string, string> = { sl: 'M/M', fm: 'F/F', gt: 'M/F', any: t('filters.anyPairing') as string, multi: t('filters.multi') as string, other: t('filters.other') as string }
  const contentLabels: Record<string, string> = { none: t('filters.noNsfw') as string, rare: t('filters.nsfwRare') as string, often: t('filters.nsfwOften') as string, core: t('filters.nsfwCore') as string, flexible: t('filters.nsfwFlexible') as string }

  const visible = games.filter(g => !g.hidden_at)

  // Tab filters
  const active = visible.filter(g => !g.left_at && g.status !== 'published')
  const inactive = visible.filter(g => !!g.left_at && g.status !== 'published')
  const starred = visible.filter(g => g.starred_at).sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
    return bTime - aTime
  })
  const published = visible.filter(g => g.status === 'published')

  // SECURITY (CRIT-1, audit-v4): server computes last_message_is_mine — we
  // never receive partner's user_id on the wire.
  const waitingMe = active.filter(g => !g.last_message_is_mine)
  const waitingThem = active.filter(g => g.last_message_is_mine)

  async function toggleStar(gameId: string) {
    const g = games.find(x => x.id === gameId)
    if (!g) return
    const newVal = !g.starred_at
    const oldVal = g.starred_at
    setGames(prev => prev.map(x => x.id === gameId ? { ...x, starred_at: newVal ? new Date().toISOString() : null } : x))
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: newVal }),
      })
      if (!res.ok) {
        setGames(prev => prev.map(x => x.id === gameId ? { ...x, starred_at: oldVal } : x))
        addToast(t('errors.networkError') as string, 'error')
      }
    } catch {
      setGames(prev => prev.map(x => x.id === gameId ? { ...x, starred_at: oldVal } : x))
      addToast(t('errors.networkError') as string, 'error')
    }
  }

  async function hideGame(gameId: string) {
    setGames(prev => prev.map(x => x.id === gameId ? { ...x, hidden_at: new Date().toISOString() } : x))
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: true }),
      })
      if (!res.ok) {
        setGames(prev => prev.map(x => x.id === gameId ? { ...x, hidden_at: null } : x))
        addToast(t('errors.networkError') as string, 'error')
      }
    } catch {
      setGames(prev => prev.map(x => x.id === gameId ? { ...x, hidden_at: null } : x))
      addToast(t('errors.networkError') as string, 'error')
    }
  }

  const tabCls = (isActive: boolean) =>
    `font-mono text-[0.7rem] tracking-[0.12em] uppercase bg-transparent border-none cursor-pointer py-2.5 transition-colors duration-150
    ${isActive ? 'text-ink border-b border-ink' : 'text-ink-2 border-b border-transparent'}`

  const subTabCls = (isActive: boolean) =>
    `font-mono text-[0.62rem] tracking-[0.1em] uppercase bg-transparent border-none cursor-pointer py-1.5 transition-colors duration-150
    ${isActive ? 'text-accent border-b border-accent' : 'text-ink-2 border-b border-transparent'}`

  const currentGames =
    mainTab === 'inactive' ? inactive
    : mainTab === 'starred' ? starred
    : mainTab === 'published' ? published
    : subTab === 'waiting-me' ? waitingMe
    : waitingThem

  return (
    <div className="max-w-[1050px] mx-auto px-7 py-8">
      <Breadcrumbs items={[
        { label: t('nav.feed') as string, href: '/' },
        { label: t('myGames.title') as string },
      ]} />
      <h1 className="page-title mb-6">{t('myGames.title') as string}</h1>

      <div className="flex gap-5 mb-1 border-b border-edge flex-wrap">
        <button onClick={() => setMainTab('active')} className={tabCls(mainTab === 'active')}>
          {t('myGames.active') as string} <span className="opacity-60">({active.length})</span>
        </button>
        <button onClick={() => setMainTab('inactive')} className={tabCls(mainTab === 'inactive')}>
          {t('myGames.inactive') as string} <span className="opacity-60">({inactive.length})</span>
        </button>
        <button onClick={() => setMainTab('starred')} className={tabCls(mainTab === 'starred')}>
          {t('myGames.starred') as string} <span className="opacity-60">({starred.length})</span>
        </button>
        <button onClick={() => setMainTab('published')} className={tabCls(mainTab === 'published')}>
          {t('myGames.publishedTab') as string} <span className="opacity-60">({published.length})</span>
        </button>
      </div>

      {mainTab === 'active' && (
        <div className="flex gap-5 mb-5 mt-5">
          <button onClick={() => setSubTab('waiting-me')} className={subTabCls(subTab === 'waiting-me')}>
            {t('myGames.waitingMyPost') as string} <span className="opacity-60">({waitingMe.length})</span>
          </button>
          <button onClick={() => setSubTab('waiting-them')} className={subTabCls(subTab === 'waiting-them')}>
            {t('myGames.waitingTheirPost') as string} <span className="opacity-60">({waitingThem.length})</span>
          </button>
        </div>
      )}

      {mainTab !== 'active' && <div className="mb-5" />}

      {currentGames.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-ink-2 font-heading italic mb-4">{t('myGames.empty') as string}</p>
          <Link href="/feed" className="btn-primary inline-block no-underline py-2.5 px-6 text-[0.9rem]">
            {t('myGames.goToFeed') as string}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-[var(--game-gap,1rem)]">
          {currentGames.map(g => {
            const tags = g.request_tags ?? []
            const activeCount = parseInt(g.active_participants) || 0
            const isInactive = !!g.left_at

            const openGame = () => router.push(`/games/${g.id}`)
            const gameTitle = g.request_title ?? t('nav.untitled') as string
            return (
              <article
                key={g.id}
                className="card cursor-pointer"
                role="link"
                tabIndex={0}
                aria-label={gameTitle}
                onClick={openGame}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                    e.preventDefault()
                    openGame()
                  }
                }}
                style={{
                  opacity: isInactive ? 0.7 : 1,
                  borderLeftWidth: 'var(--card-stripe-w)',
                  borderLeftStyle: 'solid',
                  borderLeftColor: parseInt(g.ic_unread) > 0
                    ? 'var(--accent)'
                    : parseInt(g.ooc_unread) > 0
                    ? 'var(--text-2)'
                    : 'transparent',
                }}
              >
                {/* Publish proposal banner */}
                {!isInactive && g.partner_publish_consent && g.status === 'active' && (
                  <div className="card-banner-publish">
                    {t('myGames.publishProposed') as string}
                  </div>
                )}

                {/* Header: meta + actions */}
                <div className="card-header">
                  <div className="card-meta">
                    {g.status !== 'active' && (
                      <>
                        <span className="card-status card-status-active">
                          {g.status === 'preparing' && (t('game.chipPreparing') as string)}
                          {g.status === 'moderation' && (t('game.chipModeration') as string)}
                          {g.status === 'published' && (t('game.chipPublished') as string)}
                        </span>
                        <span className="sep">|</span>
                      </>
                    )}
                    {g.request_type && <span>{typeLabels[g.request_type] ?? g.request_type}</span>}
                    {g.request_fandom_type && <><span className="sep">/</span><span>{fandomTypeLabels[g.request_fandom_type] ?? g.request_fandom_type}</span></>}
                    {g.request_pairing && g.request_pairing !== 'any' && <><span className="sep">/</span><span>{pairingLabels[g.request_pairing] ?? g.request_pairing}</span></>}
                    {g.request_content_level && <><span className="sep">/</span><span>{contentLabels[g.request_content_level] ?? g.request_content_level}</span></>}
                  </div>
                  <div className="card-actions">
                    {isInactive && (
                      <button
                        onClick={e => { e.stopPropagation(); hideGame(g.id) }}
                        title={t('myGames.hideFromList') as string}
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toggleStar(g.id) }}
                      title={g.starred_at ? t('myGames.removeFromStarred') as string : t('myGames.addToStarred') as string}
                      className={g.starred_at ? 'bookmarked' : ''}
                    >
                      <Star size={13} fill={g.starred_at ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <span className="card-title">
                  {g.request_title ?? t('nav.untitled') as string}
                </span>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="card-tags">
                    {tags.map(tg => (
                      <span key={tg} className="tag tag-user">{tg.toLowerCase()}</span>
                    ))}
                  </div>
                )}

                {/* Footer: meta line */}
                <div className="card-footer">
                  <div className="card-meta">
                    <span>{g.my_nickname}</span>
                    <span className="sep">·</span>
                    <span>{tPlural(parseInt(g.message_count) || 0, 'myGames.posts')}</span>
                    <span className="sep">·</span>
                    <span>{tPlural(activeCount, 'myGames.activeParticipant')}</span>
                  </div>
                  <div className="card-actions">
                    {g.ooc_enabled && (
                      <Link
                        href={`/games/${g.id}?tab=ooc`}
                        onClick={e => { e.stopPropagation() }}
                        className={`card-micro-badge ${parseInt(g.ooc_unread) > 0 ? 'card-micro-badge-active' : ''}`}
                      >
                        {t('game.offtop') as string}
                      </Link>
                    )}
                    {parseInt(g.ic_unread) > 0 && (
                      <span className="card-micro-badge card-micro-badge-active">
                        {t('myGames.newPostsBadge') as string}
                      </span>
                    )}
                  </div>
                </div>

              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
