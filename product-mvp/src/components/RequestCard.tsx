'use client'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useT } from './SettingsContext'

export interface Request {
  id: string
  author_id?: string
  title: string
  body: string | null
  type: 'duo' | 'multiplayer'
  content_level: 'none' | 'rare' | 'often' | 'core' | 'flexible'
  fandom_type: 'fandom' | 'original'
  pairing: 'sl' | 'fm' | 'gt' | 'any' | 'multi' | 'other'
  tags: string[]
  status: string
  created_at: string
}

interface Props {
  request: Request
  isBookmarked?: boolean
  onBookmark?: (id: string, isBookmarked: boolean) => void
  showRespond?: boolean
  onTagSearch?: (tag: string) => void
  onTagSubscribe?: (tag: string) => void
  onTagBlacklist?: (tag: string) => void
  isOwn?: boolean
}

export default function RequestCard({
  request, isBookmarked, onBookmark, showRespond = true,
  onTagSearch, onTagSubscribe, onTagBlacklist, isOwn,
}: Props) {
  const t = useT()

  const contentLabels: Record<string, string> = {
    none: t('filters.noNsfw') as string,
    rare: t('filters.nsfwRare') as string,
    often: t('filters.nsfwOften') as string,
    core: t('filters.nsfwCore') as string,
    flexible: t('filters.nsfwFlexible') as string,
  }

  const typeLabels: Record<string, string> = {
    duo: t('filters.duo') as string,
    multiplayer: t('filters.multiplayer') as string,
  }

  const fandomTypeLabels: Record<string, string> = {
    fandom: t('filters.fandom') as string,
    original: t('filters.original') as string,
  }

  const pairingLabels: Record<string, string> = {
    sl: 'M/M',
    fm: 'F/F',
    gt: 'M/F',
    any: t('filters.anyPairing') as string,
    multi: t('filters.multi') as string,
    other: t('filters.other') as string,
  }

  const [bookmarked, setBookmarked] = useState(isBookmarked ?? false)
  const [loadingBm, setLoadingBm] = useState(false)
  const [menuTag, setMenuTag] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  const createInvite = useCallback(async () => {
    setInviteLoading(true)
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id }),
    })
    const data = await res.json()
    if (data.token) {
      const link = `${window.location.origin}/invite/${data.token}`
      setInviteLink(link)
      try {
        await navigator.clipboard.writeText(link)
      } catch {
        // Clipboard unavailable on HTTP — link shown in UI instead
      }
    }
    setInviteLoading(false)
  }, [request.id])

  const isLong = !!request.body && request.body.length > 1500

  const hasTagMenu = !!(onTagSearch || onTagSubscribe || onTagBlacklist)

  useEffect(() => {
    if (!menuTag) return
    function close() { setMenuTag(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuTag])

  async function toggleBookmark(e: React.MouseEvent) {
    e.preventDefault()
    setLoadingBm(true)
    const method = bookmarked ? 'DELETE' : 'POST'
    try {
      const res = await fetch(`/api/bookmarks/${request.id}`, { method })
      if (res.ok) {
        setBookmarked(b => !b)
        onBookmark?.(request.id, !bookmarked)
      }
    } catch { alert(t('errors.networkError') as string) }
    setLoadingBm(false)
  }

  function openMenu(e: React.MouseEvent, tag: string) {
    e.stopPropagation()
    setMenuTag(prev => prev === tag ? null : tag)
  }

  function runAction(e: React.MouseEvent, fn: () => void) {
    e.stopPropagation()
    fn()
    setMenuTag(null)
  }

  return (
    <article className="card p-7 relative">
      {/* Action icons row */}
      <div className="flex items-center justify-end gap-2 mb-3">
        {isOwn && (
          <>
            <button
              onClick={createInvite}
              disabled={inviteLoading}
              title={t('card.copyInvite') as string}
              className={`bg-transparent border-none cursor-pointer p-0 leading-none flex items-center transition-[color,opacity] duration-150
                ${inviteLink ? 'text-accent' : 'text-ink-2 opacity-65 hover:opacity-100'}`}
            >
              {inviteLoading ? '...' : inviteLink ? '✓' : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
            </button>
            <Link href={`/requests/${request.id}/edit`} title={t('card.edit') as string}
              className="text-ink-2 text-[0.9rem] leading-none no-underline opacity-50 hover:opacity-100 inline-block scale-x-[-1]"
            >
              ✎
            </Link>
          </>
        )}
        <button onClick={toggleBookmark} disabled={loadingBm} title={bookmarked ? t('card.removeBookmark') as string : t('card.addBookmark') as string}
          className={`bg-transparent border-none cursor-pointer text-[1.1rem] p-0 leading-none ${bookmarked ? 'text-accent' : 'text-ink-2'}`}
        >
          {bookmarked ? '★' : '☆'}
        </button>
      </div>

      {/* Title */}
      <div className="mb-3">
        <Link href={`/requests/${request.id}`}>
          <h3 className="font-heading text-[1.2rem] font-normal text-ink leading-tight break-words">
            {request.title}
          </h3>
        </Link>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="badge badge-type">{typeLabels[request.type]}</span>
        <span className="badge badge-fandom">{fandomTypeLabels[request.fandom_type]}</span>
        {request.pairing !== 'any' && <span className="badge badge-fandom">{pairingLabels[request.pairing]}</span>}
        <span className="badge badge-content">{contentLabels[request.content_level]}</span>
        {request.tags.map(tag => (
          <span key={tag} className="relative inline-flex">
            <span
              onClick={hasTagMenu ? e => openMenu(e, tag) : undefined}
              className={`badge badge-tag ${hasTagMenu ? 'cursor-pointer' : 'cursor-default'} select-none
                ${menuTag === tag ? 'border-accent text-accent' : ''}`}
            >
              {tag.toLowerCase()}
            </span>

            {menuTag === tag && (
              <div
                onClick={e => e.stopPropagation()}
                className="absolute top-[calc(100%+4px)] left-0 z-200 bg-surface border border-edge min-w-[190px] shadow-[0_4px_16px_var(--shadow)]"
              >
                {onTagSearch && (
                  <button onClick={e => runAction(e, () => onTagSearch(tag))} className="tag-menu-item">
                    {t('card.searchByTag') as string}
                  </button>
                )}
                {onTagSubscribe && (
                  <button onClick={e => runAction(e, () => onTagSubscribe(tag))} className="tag-menu-item">
                    {t('card.addToSearch') as string}
                  </button>
                )}
                {onTagBlacklist && (
                  <button onClick={e => runAction(e, () => onTagBlacklist(tag))} className="tag-menu-item border-t border-edge text-accent">
                    {t('card.hideTag') as string}
                  </button>
                )}
              </div>
            )}
          </span>
        ))}
      </div>

      {/* Preview */}
      {request.body && (
        <div className="mb-5">
          <div className="relative">
            <div
              className="text-ink-2 text-[0.95rem] leading-[1.7] break-words overflow-hidden"
              style={{ maxHeight: isLong && !expanded ? '17rem' : 'none' }}
              onClick={e => { const el = e.target as HTMLElement; if (el.classList.contains('ooc-spoiler')) el.classList.toggle('ooc-spoiler-open') }}
              dangerouslySetInnerHTML={{ __html: request.body }}
            />
            {isLong && !expanded && (
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-surface-2 pointer-events-none" />
            )}
          </div>
          {isLong && (
            <button
              onClick={e => { e.preventDefault(); setExpanded(x => !x) }}
              className="link-accent bg-transparent border-none cursor-pointer block pt-[0.3rem]"
            >
              {expanded ? t('card.collapse') as string : t('card.readMore') as string}
            </button>
          )}
        </div>
      )}

      {/* Invite link */}
      {inviteLink && (
        <div className="mb-4 p-3 bg-surface-3 border border-edge">
          <code className="font-mono text-[0.78rem] text-accent break-all select-all">{inviteLink}</code>
        </div>
      )}

      {/* Footer */}
      {showRespond && (
        isOwn ? (
          <span className="link-accent text-ink-2">
            {t('card.ownRequest') as string}
          </span>
        ) : (
          <Link href={`/requests/${request.id}`} className="link-accent no-underline">
            {t('card.respond') as string}
          </Link>
        )
      )}
    </article>
  )
}
