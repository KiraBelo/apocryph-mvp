'use client'
import { useState } from 'react'
import Link from 'next/link'
import RequestCard, { Request } from './RequestCard'
import { useT } from './SettingsContext'
import type { LikedGame } from '@/app/bookmarks/page'

interface Props {
  requests: (Request & { status: string })[]
  likedGames: LikedGame[]
  userId: string
}

export default function BookmarksClient({ requests, likedGames, userId: _userId }: Props) {
  const t = useT()
  const [tab, setTab] = useState<'requests' | 'games'>('requests')
  const [games, setGames] = useState(likedGames)

  const tabCls = (active: boolean) =>
    `font-mono text-[0.7rem] tracking-[0.12em] uppercase bg-transparent border-none cursor-pointer py-2.5 transition-colors duration-150
    ${active ? 'text-ink border-b border-ink' : 'text-ink-2 border-b border-transparent'}`

  async function unlike(gameId: string) {
    setGames(prev => prev.filter(g => g.id !== gameId))
    try {
      const res = await fetch(`/api/public-games/${gameId}/likes`, { method: 'POST' })
      if (!res.ok) {
        // Restore on failure
        setGames(likedGames)
      }
    } catch {
      setGames(likedGames)
    }
  }

  return (
    <div className="max-w-[1050px] mx-auto p-[3rem_1.75rem]">
      <p className="section-label text-accent-2 mb-2">{t('bookmarks.sectionLabel') as string}</p>
      <h1 className="font-heading text-[clamp(1.8rem,4vw,2.8rem)] italic font-light text-ink mb-8">
        {t('bookmarks.title') as string}
      </h1>

      <div className="flex gap-8 mb-8 border-b border-edge">
        <button onClick={() => setTab('requests')} className={tabCls(tab === 'requests')}>
          {t('bookmarks.tabRequests') as string} <span className="opacity-60">({requests.length})</span>
        </button>
        <button onClick={() => setTab('games')} className={tabCls(tab === 'games')}>
          {t('bookmarks.tabGames') as string} <span className="opacity-60">({games.length})</span>
        </button>
      </div>

      {tab === 'requests' && (
        <>
          {requests.length === 0 ? (
            <p className="text-ink-2 font-heading italic text-[1.1rem]">
              {t('bookmarks.empty') as string}
            </p>
          ) : (
            <div className="grid gap-[var(--game-gap,1rem)]">
              {requests.map(r => (
                <RequestCard
                  key={r.id}
                  request={r}
                  isBookmarked
                  statusLabel={r.status === 'active' ? t('bookmarks.statusActive') as string : t('bookmarks.statusInactive') as string}
                  statusActive={r.status === 'active'}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'games' && (
        <>
          {games.length === 0 ? (
            <p className="text-ink-2 font-heading italic text-[1.1rem]">
              {t('bookmarks.emptyGames') as string}
            </p>
          ) : (
            <div className="grid gap-[var(--game-gap,1rem)]">
              {games.map(g => (
                <article key={g.id} className="card p-7 relative">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <Link href={`/library/${g.id}`}>
                      <h3 className="font-heading text-[1.2rem] font-normal text-ink leading-tight break-words">
                        {g.request_title ?? t('nav.untitled') as string}
                      </h3>
                    </Link>
                    <button
                      onClick={() => unlike(g.id)}
                      title={t('bookmarks.unlike') as string}
                      className="bg-transparent border-none cursor-pointer text-[1.1rem] p-0 leading-none text-accent shrink-0"
                    >
                      ★
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="meta-text">
                      {new Date(g.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {parseInt(g.likes_count) > 0 && (
                      <span className="meta-text">♥ {g.likes_count}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
