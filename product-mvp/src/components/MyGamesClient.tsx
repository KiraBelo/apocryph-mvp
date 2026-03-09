'use client'

import { useState } from 'react'
import Link from 'next/link'

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
}

const typeLabels: Record<string, string> = { duo: 'На двоих', multiplayer: 'Мультиплеер' }
const fandomTypeLabels: Record<string, string> = { fandom: 'Фандом', original: 'Оридж' }
const pairingLabels: Record<string, string> = { sl: 'M/M', fm: 'F/F', gt: 'M/F', any: 'Любой пейринг', multi: 'Мульти', other: 'Другое' }
const contentLabels: Record<string, string> = { none: 'без постельных сцен', rare: 'редко', often: 'часто', core: 'основа сюжета', flexible: 'по договорённости' }

function pluralActive(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} активный`
  return `${n} активных`
}

interface Props {
  games: GameRow[]
  userId: string
}

export default function MyGamesClient({ games: initialGames, userId }: Props) {
  const [games, setGames] = useState(initialGames)
  const [mainTab, setMainTab] = useState<'active' | 'finished' | 'starred'>('active')
  const [subTab, setSubTab] = useState<'waiting-them' | 'waiting-me'>('waiting-me')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const visible = games.filter(g => !g.hidden_at)
  const active = visible.filter(g => !g.left_at)
  const finished = visible.filter(g => g.left_at)
  const starred = visible.filter(g => g.starred_at).sort((a, b) => {
    const aFinished = a.left_at ? 1 : 0
    const bFinished = b.left_at ? 1 : 0
    if (aFinished !== bFinished) return aFinished - bFinished
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
    return bTime - aTime
  })

  const waitingMe = active.filter(g => g.last_message_user_id !== userId)
  const waitingThem = active.filter(g => g.last_message_user_id === userId)

  async function toggleStar(gameId: string) {
    const g = games.find(x => x.id === gameId)
    if (!g) return
    const newVal = !g.starred_at
    setGames(prev => prev.map(x => x.id === gameId ? { ...x, starred_at: newVal ? new Date().toISOString() : null } : x))
    await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: newVal }),
    })
  }

  async function hideGame(gameId: string) {
    setGames(prev => prev.map(x => x.id === gameId ? { ...x, hidden_at: new Date().toISOString() } : x))
    await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: true }),
    })
  }

  const tabCls = (isActive: boolean) =>
    `font-mono text-[0.7rem] tracking-[0.12em] uppercase bg-transparent border-none cursor-pointer py-2.5 transition-colors duration-150
    ${isActive ? 'text-ink border-b border-ink' : 'text-ink-2 border-b border-transparent'}`

  const subTabCls = (isActive: boolean) =>
    `font-mono text-[0.62rem] tracking-[0.1em] uppercase bg-transparent border-none cursor-pointer py-1.5 transition-colors duration-150
    ${isActive ? 'text-accent border-b border-accent' : 'text-ink-2 border-b border-transparent'}`

  const currentGames =
    mainTab === 'finished'
      ? finished
      : mainTab === 'starred'
      ? starred
      : subTab === 'waiting-me'
      ? waitingMe
      : waitingThem

  return (
    <div className="max-w-[1050px] mx-auto px-7 py-12">
      <p className="section-label mb-2">§ Мои игры</p>
      <h1 className="page-title mb-10">Мои игры</h1>

      <div className="flex gap-8 mb-1 border-b border-edge">
        <button onClick={() => setMainTab('active')} className={tabCls(mainTab === 'active')}>
          Активные <span className="opacity-60">({active.length})</span>
        </button>
        <button onClick={() => setMainTab('starred')} className={tabCls(mainTab === 'starred')}>
          Избранные <span className="opacity-60">({starred.length})</span>
        </button>
        <button onClick={() => setMainTab('finished')} className={tabCls(mainTab === 'finished')}>
          Завершённые <span className="opacity-60">({finished.length})</span>
        </button>
      </div>

      {mainTab === 'active' && (
        <div className="flex gap-8 mb-8 mt-5">
          <button onClick={() => setSubTab('waiting-me')} className={subTabCls(subTab === 'waiting-me')}>
            Ждут мой пост <span className="opacity-60">({waitingMe.length})</span>
          </button>
          <button onClick={() => setSubTab('waiting-them')} className={subTabCls(subTab === 'waiting-them')}>
            Жду пост соигрока <span className="opacity-60">({waitingThem.length})</span>
          </button>
        </div>
      )}

      {mainTab !== 'active' && <div className="mb-8" />}

      {currentGames.length === 0 ? (
        <p className="text-ink-2 font-heading italic">Пусто.</p>
      ) : (
        <div className="flex flex-col gap-[var(--game-gap,1rem)]">
          {currentGames.map(g => {
            const tags = g.request_tags ?? []
            const activeCount = parseInt(g.active_participants) || 0

            return (
              <article
                key={g.id}
                className="card p-7 relative"
                style={{
                  opacity: mainTab === 'finished' ? 0.7 : 1,
                  borderLeft: parseInt(g.ic_unread) > 0
                    ? '3px solid var(--accent)'
                    : parseInt(g.ooc_unread) > 0
                    ? '3px solid var(--text-2)'
                    : '3px solid transparent',
                }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <Link href={`/games/${g.id}`}>
                    <h3 className="font-heading text-[1.2rem] font-normal text-ink leading-tight break-words">
                      {g.request_title ?? 'Без названия'}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {g.left_at && (
                      <button
                        onClick={() => hideGame(g.id)}
                        title="Скрыть из списка"
                        className="bg-transparent border-none cursor-pointer text-ink-2 text-[0.85rem] leading-none opacity-50 hover:opacity-100 hover:text-accent p-[0.2rem_0.3rem]"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      onClick={() => toggleStar(g.id)}
                      title={g.starred_at ? 'Убрать из избранного' : 'В избранное'}
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
                  {tags.map(t => (
                    <span key={t} className="badge badge-tag">#{t.toLowerCase()}</span>
                  ))}
                </div>

                {/* Meta line */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="meta-text">
                    Никнейм: {g.my_nickname} &nbsp;·&nbsp; {g.message_count} постов &nbsp;·&nbsp; {pluralActive(activeCount)}
                  </p>
                  {g.ooc_enabled && (
                    <Link
                      href={`/games/${g.id}?tab=ooc`}
                      onClick={e => e.stopPropagation()}
                      className={`font-mono text-[0.58rem] tracking-[0.06em] py-[0.05rem] px-1.5 rounded-sm no-underline
                      ${parseInt(g.ooc_unread) > 0
                        ? 'text-white bg-accent border-none'
                        : 'text-ink-2 bg-transparent border border-edge'}`}>
                      оффтоп
                    </Link>
                  )}
                  {parseInt(g.ic_unread) > 0 && (
                    <span className="font-mono text-[0.58rem] tracking-[0.06em] text-white bg-accent py-[0.05rem] px-1.5 rounded-sm">
                      новые посты
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-5">
                  <Link href={`/games/${g.id}`} className="link-accent no-underline">
                    Открыть →
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
