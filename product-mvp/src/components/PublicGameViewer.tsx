'use client'

import { useEffect, useState, useCallback, memo } from 'react'
import Link from 'next/link'
import { useT } from './SettingsContext'
import { feedPostBg } from '@/lib/game-utils'

const MsgContent = memo(function MsgContent({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />
}, (prev, next) => prev.html === next.html && prev.className === next.className)

interface Participant {
  id: string
  nickname: string
  avatar_url: string | null
}

interface Message {
  id: string
  participant_id: string
  content: string
  created_at: string
  nickname: string
  avatar_url: string | null
}

interface GameData {
  game: { id: string; banner_url: string | null; published_at: string }
  request: {
    title: string | null; type: string | null; fandom_type: string | null
    pairing: string | null; content_level: string | null
    tags: string[] | null; body: string | null
  } | null
  participants: Participant[]
  messages: Message[]
  page: number
  totalPages: number
  total: number
}

type Layout = 'dialog' | 'feed' | 'book'

export default function PublicGameViewer({ gameId }: { gameId: string }) {
  const t = useT()
  const [data, setData] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const [layout, setLayout] = useState<Layout>('feed')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/public-games/${gameId}?page=${page}`)
      if (!res.ok) { setError(true); return }
      setData(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [gameId, page])

  useEffect(() => { load() }, [load])

  if (loading && !data) {
    return (
      <div className="max-w-[1400px] mx-auto px-7 py-12">
        <p className="text-ink-2 font-heading italic">{t('library.loading') as string}</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-[1400px] mx-auto px-7 py-12">
        <p className="text-ink-2 font-heading italic">{t('library.notFound') as string}</p>
        <Link href="/library" className="link-accent no-underline mt-4 inline-block">
          {t('library.backToLibrary') as string}
        </Link>
      </div>
    )
  }

  const { game, request, participants, messages, totalPages } = data
  const participantMap = new Map(participants.map(p => [p.id, p]))

  const contentLabels: Record<string, string> = {
    none: t('filters.noNsfw') as string, rare: t('filters.nsfwRare') as string,
    often: t('filters.nsfwOften') as string, core: t('filters.nsfwCore') as string,
    flexible: t('filters.nsfwFlexible') as string,
  }

  return (
    <div className="max-w-[1400px] mx-auto px-7 py-12">
      {/* Back link */}
      <Link href="/library" className="link-accent no-underline text-[0.85rem] mb-6 inline-block">
        ← {t('library.backToLibrary') as string}
      </Link>

      {/* Banner */}
      {game.banner_url && (
        <div className="mb-6 rounded overflow-hidden" style={{ maxHeight: '200px' }}>
          <img src={game.banner_url} alt="" className="w-full object-cover" style={{ maxHeight: '200px' }} />
        </div>
      )}

      {/* Title */}
      <h1 className="page-title mb-4">
        {request?.title ?? t('nav.untitled') as string}
      </h1>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {request?.type && (
          <span className="badge badge-type">
            {request.type === 'duo' ? t('filters.duo') as string : t('filters.multiplayer') as string}
          </span>
        )}
        {request?.fandom_type && (
          <span className="badge badge-fandom">
            {request.fandom_type === 'fandom' ? t('filters.fandom') as string : t('filters.original') as string}
          </span>
        )}
        {request?.pairing && request.pairing !== 'any' && (
          <span className="badge badge-fandom">
            {request.pairing === 'sl' ? 'M/M' : request.pairing === 'fm' ? 'F/F' : request.pairing === 'gt' ? 'M/F' : request.pairing}
          </span>
        )}
        {request?.content_level && (
          <span className="badge badge-content">{contentLabels[request.content_level] ?? request.content_level}</span>
        )}
        {(request?.tags ?? []).map(tag => (
          <span key={tag} className="badge badge-tag">#{tag.toLowerCase()}</span>
        ))}
      </div>

      {/* Participants */}
      <div className="flex items-center gap-3 mb-6">
        <span className="section-label">{t('library.participants') as string}</span>
        {participants.map(p => (
          <span key={p.id} className="flex items-center gap-1.5">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-surface-3 flex items-center justify-center font-mono text-[0.5rem] text-ink-2">
                {p.nickname[0]?.toUpperCase()}
              </span>
            )}
            <span className="font-body text-[0.85rem] text-ink">{p.nickname}</span>
          </span>
        ))}
      </div>

      {/* Layout switcher */}
      <div className="flex items-center gap-2 mb-6">
        <span className="section-label mr-2">{t('library.layout') as string}</span>
        {([['dialog', t('game.layoutDialog')], ['feed', t('game.layoutFeed')], ['book', t('game.layoutBook')]] as [Layout, string][]).map(([l, label]) => (
          <button
            key={l}
            onClick={() => setLayout(l)}
            className={`font-mono text-[0.6rem] tracking-[0.1em] uppercase border-none cursor-pointer py-1 px-2
              ${layout === l ? 'bg-accent text-white' : 'bg-transparent text-ink-2 hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className={`flex flex-col gap-0 mx-auto w-full ${layout === 'feed' ? 'max-w-[1050px]' : ''}`}>
        {messages.map((msg, idx) => {
          const author = participantMap.get(msg.participant_id)
          const nickname = author?.nickname ?? msg.nickname
          const avatarUrl = author?.avatar_url ?? msg.avatar_url
          const isFirst = idx === 0 || messages[idx - 1].participant_id !== msg.participant_id
          const initial = nickname[0]?.toUpperCase() ?? '?'

          if (layout === 'book') {
            return (
              <div key={msg.id} className="py-3 border-b border-edge">
                {isFirst && (
                  <p className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-ink-2 mb-1">{nickname}</p>
                )}
                <MsgContent html={msg.content} className="font-body text-[0.95rem] text-ink leading-relaxed tiptap-content" />
              </div>
            )
          }

          if (layout === 'feed') {
            const isEven = idx % 2 === 0
            return (
              <div
                key={msg.id}
                className="flex gap-3 py-3 px-4"
                style={{
                  flexDirection: isEven ? 'row' : 'row-reverse',
                  background: feedPostBg(msg.participant_id),
                }}
              >
                {isFirst && (
                  <div className="shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center font-mono text-[0.55rem] text-ink-2">
                        {initial}
                      </span>
                    )}
                  </div>
                )}
                {!isFirst && <div className="w-8 shrink-0" />}
                <div className="flex-1 min-w-0" style={{ textAlign: isEven ? 'left' : 'right' }}>
                  {isFirst && (
                    <p className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-ink-2 mb-1">{nickname}</p>
                  )}
                  <MsgContent html={msg.content} className="font-body text-[0.95rem] text-ink leading-relaxed tiptap-content" />
                </div>
              </div>
            )
          }

          // dialog layout
          const isMine = idx % 2 === 0
          return (
            <div
              key={msg.id}
              className="flex gap-3 py-3 px-4"
              style={{ justifyContent: isMine ? 'flex-end' : 'flex-start' }}
            >
              {!isMine && isFirst && (
                avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center font-mono text-[0.55rem] text-ink-2 shrink-0">
                    {initial}
                  </span>
                )
              )}
              {!isMine && !isFirst && <div className="w-8 shrink-0" />}
              <div className="max-w-[75%] min-w-0">
                {isFirst && (
                  <p className={`font-mono text-[0.6rem] tracking-[0.12em] uppercase text-ink-2 mb-1 ${isMine ? 'text-right' : ''}`}>
                    {nickname}
                  </p>
                )}
                <div
                  className="p-3 rounded"
                  style={{ background: isMine ? 'var(--accent-dim)' : 'var(--bg-3)' }}
                >
                  <MsgContent html={msg.content} className="font-body text-[0.95rem] text-ink leading-relaxed tiptap-content" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === 1}
            className="btn-ghost text-[0.65rem] tracking-[0.1em] p-[0.35rem_0.8rem] disabled:opacity-30"
          >
            {t('feed.prev') as string}
          </button>
          <span className="font-mono text-[0.7rem] text-ink-2">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === totalPages}
            className="btn-ghost text-[0.65rem] tracking-[0.1em] p-[0.35rem_0.8rem] disabled:opacity-30"
          >
            {t('feed.next') as string}
          </button>
        </div>
      )}
    </div>
  )
}
