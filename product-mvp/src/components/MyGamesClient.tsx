'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useT } from './SettingsContext'
import { useToast } from './ToastProvider'

interface GameRow {
  id: string
  request_title: string | null
  created_at: string
  left_at: string | null
  my_nickname: string
  message_count: string
  active_participants: string
  last_message_user_id: string | null
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
  userId: string
}

type MainTab = 'active' | 'inactive' | 'starred' | 'published'

export default function MyGamesClient({ games: initialGames, userId }: Props) {
  const t = useT()
  const { addToast } = useToast()
  const router = useRouter()
  const [games, setGames] = useState(initialGames)
  const [mainTab, setMainTab] = useState<MainTab>('active')
  const [subTab, setSubTab] = useState<'waiting-them' | 'waiting-me'>('waiting-me')

  const typeLabels: Record<string, string> = { duo: t('filters.duo') as string, multiplayer: t('filters.multiplayer') as string }
  const fandomTypeLabels: Record<string, string> = { fandom: t('filters.fandom') as string, original: t('filters.original') as string }
  const pairingLabels: Record<string, string> = { sl: 'M/M', fm: 'F/F', gt: 'M/F', any: t('filters.anyPairing') as string, multi: t('filters.multi') as string, other: t('filters.other') as string }
  const contentLabels: Record<string, string> = { none: t('filters.noNsfw') as string, rare: t('filters.nsfwRare') as string, often: t('filters.nsfwOften') as string, core: t('filters.nsfwCore') as string, flexible: t('filters.nsfwFlexible') as string }

  function pluralActive(n: number): string {
    if (n === 1) return `${n} ${t('myGames.activeParticipant') as string}`
    return `${n} ${t('myGames.activeParticipants') as string}`
  }

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

  const waitingMe = active.filter(g => g.last_message_user_id !== userId)
  const waitingThem = active.filter(g => g.last_message_user_id === userId)

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
    <div className="max-w-[1050px] mx-auto px-7 py-12">
      <p className="section-label mb-2">{t('myGames.sectionLabel') as string}</p>
      <h1 className="page-title mb-10">{t('myGames.title') as string}</h1>

      <div className="flex gap-8 mb-1 border-b border-edge flex-wrap">
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
        <div className="flex gap-8 mb-8 mt-5">
          <button onClick={() => setSubTab('waiting-me')} className={subTabCls(subTab === 'waiting-me')}>
            {t('myGames.waitingMyPost') as string} <span className="opacity-60">({waitingMe.length})</span>
          </button>
          <button onClick={() => setSubTab('waiting-them')} className={subTabCls(subTab === 'waiting-them')}>
            {t('myGames.waitingTheirPost') as string} <span className="opacity-60">({waitingThem.length})</span>
          </button>
        </div>
      )}

      {mainTab !== 'active' && <div className="mb-8" />}

      {currentGames.length === 0 ? (
        <div className="text-center py-12">
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

            return (
              <article
                key={g.id}
                className="card p-7 relative cursor-pointer"
                onClick={() => router.push(`/games/${g.id}`)}
                style={{
                  opacity: isInactive ? 0.7 : 1,
                  borderLeft: parseInt(g.ic_unread) > 0
                    ? '3px solid var(--accent)'
                    : parseInt(g.ooc_unread) > 0
                    ? '3px solid var(--text-2)'
                    : '3px solid transparent',
                }}
              >
                {/* Publish proposal banner */}
                {!isInactive && g.partner_publish_consent && g.status === 'active' && (
                  <div className="flex items-center gap-2 -mx-7 -mt-7 mb-4 px-5 py-2 font-mono text-[0.65rem] tracking-[0.08em]"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderBottom: '1px solid var(--accent)' }}>
                    {t('myGames.publishProposed') as string}
                  </div>
                )}

                {/* Header row */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className="font-heading text-[1.2rem] font-normal text-ink leading-tight break-words">
                    {g.request_title ?? t('nav.untitled') as string}
                  </h3>
                  <div className="flex items-center gap-3 shrink-0">
                    {g.status === 'preparing' && (
                      <span className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-accent">
                        {t('game.chipPreparing') as string}
                      </span>
                    )}
                    {g.status === 'moderation' && (
                      <span className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-accent">
                        {t('game.chipModeration') as string}
                      </span>
                    )}
                    {g.status === 'published' && (
                      <span className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-accent">
                        {t('game.chipPublished') as string}
                      </span>
                    )}
                    {isInactive && (
                      <button
                        onClick={e => { e.stopPropagation(); hideGame(g.id) }}
                        title={t('myGames.hideFromList') as string}
                        className="bg-transparent border-none cursor-pointer text-ink-2 text-[0.85rem] leading-none opacity-50 hover:opacity-100 hover:text-accent p-[0.2rem_0.3rem]"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toggleStar(g.id) }}
                      title={g.starred_at ? t('myGames.removeFromStarred') as string : t('myGames.addToStarred') as string}
                      className={`bg-transparent border-none cursor-pointer text-[1.1rem] p-0 leading-none ${g.starred_at ? 'text-accent' : 'text-ink-2'}`}
                    >
                      {g.starred_at ? '★' : '☆'}
                    </button>
                  </div>
                </div>

                {/* Badges + tags row */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {g.request_type && <span className="badge badge-type">{typeLabels[g.request_type] ?? g.request_type}</span>}
                  {g.request_fandom_type && <span className="badge badge-fandom">{fandomTypeLabels[g.request_fandom_type] ?? g.request_fandom_type}</span>}
                  {g.request_pairing && g.request_pairing !== 'any' && <span className="badge badge-fandom">{pairingLabels[g.request_pairing] ?? g.request_pairing}</span>}
                  {g.request_content_level && <span className="badge badge-content">{contentLabels[g.request_content_level] ?? g.request_content_level}</span>}
                  {tags.map(tg => (
                    <span key={tg} className="badge badge-tag">#{tg.toLowerCase()}</span>
                  ))}
                </div>

                {/* Meta line */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="meta-text">
                    {t('myGames.nickname') as string} {g.my_nickname} &nbsp;·&nbsp; {g.message_count} {t('myGames.posts') as string} &nbsp;·&nbsp; {pluralActive(activeCount)}
                  </p>
                  {g.ooc_enabled && (
                    <Link
                      href={`/games/${g.id}?tab=ooc`}
                      onClick={e => { e.stopPropagation() }}
                      className={`font-mono text-[0.58rem] tracking-[0.06em] py-[0.05rem] px-1.5 rounded-sm no-underline
                      ${parseInt(g.ooc_unread) > 0
                        ? 'text-white bg-accent border-none'
                        : 'text-ink-2 bg-transparent border border-edge'}`}>
                      {t('game.offtop') as string}
                    </Link>
                  )}
                  {parseInt(g.ic_unread) > 0 && (
                    <span className="font-mono text-[0.58rem] tracking-[0.06em] text-white bg-accent py-[0.05rem] px-1.5 rounded-sm">
                      {t('myGames.newPostsBadge') as string}
                    </span>
                  )}
                </div>

              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
