'use client'

import { useEffect, useState, useCallback, memo } from 'react'
import Link from 'next/link'
import { useT } from './SettingsContext'
import PublicComments from './game/PublicComments'
import { Heart } from 'lucide-react'

const MsgContent = memo(function MsgContent({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
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
  game: { id: string; banner_url: string | null; published_at: string; author_user_ids?: string[] }
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

export default function PublicGameViewer({ gameId, userId }: { gameId: string; userId: string | null }) {
  const t = useT()
  const [data, setData] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const [likesCount, setLikesCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)

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

  useEffect(() => {
    fetch(`/api/public-games/${gameId}/likes`)
      .then(r => r.ok ? r.json() : { count: 0, liked: false })
      .then(d => { setLikesCount(d.count ?? 0); setLiked(d.liked ?? false) })
      .catch(() => {})
  }, [gameId])

  async function toggleLike() {
    if (!userId || likeLoading) return
    setLikeLoading(true)
    try {
      const res = await fetch(`/api/public-games/${gameId}/likes`, { method: 'POST' })
      if (res.ok) {
        const d = await res.json()
        setLikesCount(d.count ?? 0)
        setLiked(d.liked ?? false)
      }
    } finally {
      setLikeLoading(false)
    }
  }

  useEffect(() => { load() }, [load])

  if (loading && !data) {
    return (
      <div className="max-w-[920px] mx-auto px-8 py-12">
        <p className="text-ink-2 font-heading italic">{t('library.loading') as string}</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-[920px] mx-auto px-8 py-12">
        <p className="text-ink-2 font-heading italic">{t('library.notFound') as string}</p>
        <Link href="/library" className="link-accent no-underline mt-4 inline-block">
          {t('library.backToLibrary') as string}
        </Link>
      </div>
    )
  }

  const { game, request, participants, messages, totalPages } = data
  const authorUserIds = game.author_user_ids ?? []

  // Build participant→side map: first participant = A (left), second = B (right)
  const participantIds = [...new Set(messages.map(m => m.participant_id))]
  const sideMap = new Map<string, 'a' | 'b'>()
  participantIds.forEach((id, i) => sideMap.set(id, i === 0 ? 'a' : 'b'))

  const participantMap = new Map(participants.map(p => [p.id, p]))

  const contentLabels: Record<string, string> = {
    none: t('filters.noNsfw') as string, rare: t('filters.nsfwRare') as string,
    often: t('filters.nsfwOften') as string, core: t('filters.nsfwCore') as string,
    flexible: t('filters.nsfwFlexible') as string,
  }

  const metaParts = [
    request?.type && (request.type === 'duo' ? t('filters.duo') as string : t('filters.multiplayer') as string),
    request?.fandom_type && (request.fandom_type === 'fandom' ? t('filters.fandom') as string : t('filters.original') as string),
    request?.pairing && request.pairing !== 'any' && (
      request.pairing === 'sl' ? 'M/M' : request.pairing === 'fm' ? 'F/F' : request.pairing === 'gt' ? 'M/F' : request.pairing
    ),
    request?.content_level && (contentLabels[request.content_level] ?? request.content_level),
  ].filter(Boolean) as string[]

  const tags = request?.tags ?? []

  return (
    <div>
      {/* ── Header ── */}
      <div className="max-w-[920px] mx-auto px-8 pt-12">
        <Link href="/library" className="link-accent no-underline mb-8 inline-block">
          ← {t('library.backToLibrary') as string}
        </Link>

        {/* Title */}
        <h1 className="font-heading text-[2.4rem] italic font-light text-ink leading-[1.2] text-center mb-2">
          {request?.title ?? t('nav.untitled') as string}
        </h1>

        {/* Meta line */}
        <p className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-ink-3 text-center mb-1">
          {metaParts.join(' / ')}
        </p>

        {/* Authors */}
        <p className="font-heading text-[1.1rem] italic text-ink-2 text-center mb-3">
          {participants.map(p => p.nickname).join('  &  ')}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex justify-center flex-wrap gap-[0.4rem] mb-4">
            {tags.map(tag => (
              <span key={tag} className="font-mono text-[0.55rem] tracking-[0.05em] uppercase p-[0.12rem_0.4rem] text-ink-3 border border-edge">
                {tag.toLowerCase()}
              </span>
            ))}
          </div>
        )}

        {/* Epigraph (request body preview) */}
        {request?.body && (
          <p className="font-heading italic text-[0.95rem] text-ink-2 leading-[1.65] max-w-[500px] mx-auto text-center mb-5 line-clamp-3">
            {request.body.replace(/<[^>]+>/g, '').slice(0, 200)}
          </p>
        )}

        {/* Like button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={toggleLike}
            disabled={!userId || likeLoading}
            className={`flex items-center gap-[0.4rem] font-mono text-[0.62rem] tracking-[0.08em] border px-3 py-[0.3rem] transition-colors duration-150
              ${liked ? 'bg-accent-dim text-accent border-accent' : 'bg-transparent text-ink-2 border-edge'}
              ${userId ? 'cursor-pointer' : 'cursor-default'}`}
            title={!userId ? (t('game.likeLoginHint') as string) : undefined}
          >
            <Heart size={14} strokeWidth={1.6} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
            {t('game.likeButton') as string}
            {likesCount > 0 && <span className="opacity-60">({likesCount})</span>}
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="max-w-[920px] mx-auto border-t border-edge my-6" />

      {/* ── Reading area ── */}
      <div className="max-w-[920px] mx-auto px-8 pb-12">
        <div className="flex flex-col">
          {messages.map(msg => {
            const author = participantMap.get(msg.participant_id)
            const nickname = author?.nickname ?? msg.nickname
            const side = sideMap.get(msg.participant_id) ?? 'a'

            return (
              <div key={msg.id} className="mb-5">
                <p className={`font-heading text-[0.85rem] italic mb-[0.3rem] ${side === 'a' ? 'text-accent-2' : 'text-accent text-right'}`}>
                  {nickname}
                </p>
                <MsgContent
                  html={msg.content}
                  className="tiptap-content text-[1.05rem] leading-[1.85] text-ink"
                  /* justify + hyphens via inline since tiptap-content sets font */
                />
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-[0.5rem] pt-6 border-t border-edge mt-8">
            <button
              onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              disabled={page === 1}
              className="page-btn"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1]) > 1) acc.push('dots')
                acc.push(p)
                return acc
              }, [])
              .map((item, i) =>
                item === 'dots' ? (
                  <span key={`d-${i}`} className="font-mono text-[0.6rem] text-ink-2 px-1">&hellip;</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => { setPage(item as number); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className={`page-btn ${item === page ? 'page-btn-active' : ''}`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              disabled={page === totalPages}
              className="page-btn"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="max-w-[920px] mx-auto px-8 pb-12">
        <PublicComments gameId={gameId} userId={userId} authorUserIds={authorUserIds} />
      </div>
    </div>
  )
}
