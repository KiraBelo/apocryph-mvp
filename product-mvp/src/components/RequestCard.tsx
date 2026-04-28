'use client'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useT } from './SettingsContext'
import { useToast } from './ToastProvider'
import { Link2, Pencil, Star, ChevronRight, Check } from 'lucide-react'
import type { RequestStatus } from '@/types/api'

export interface Request {
  id: string
  author_id?: string
  title: string
  body: string | null
  type: 'duo' | 'multiplayer'
  content_level: 'none' | 'rare' | 'often' | 'core' | 'flexible'
  fandom_type: 'fandom' | 'original'
  pairing: 'sl' | 'fm' | 'gt' | 'any' | 'multi' | 'other'
  language: 'ru' | 'en'
  tags: string[]
  status: RequestStatus
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
  statusLabel?: string
  statusActive?: boolean
}

export default function RequestCard({
  request, isBookmarked, onBookmark, showRespond = true,
  onTagSearch, onTagSubscribe, onTagBlacklist, isOwn,
  statusLabel, statusActive,
}: Props) {
  const t = useT()
  const { addToast } = useToast()

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

  const languageLabels: Record<string, string> = {
    ru: t('filters.langRu') as string,
    en: t('filters.langEn') as string,
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

  const bodyRef = useRef<HTMLDivElement>(null)
  const [isLong, setIsLong] = useState(false)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    requestAnimationFrame(() => {
      // Temporarily apply max-height to measure if content overflows
      const style = getComputedStyle(document.documentElement)
      const maxBody = parseFloat(style.getPropertyValue('--card-body-size')) * 1.65 * parseFloat(style.getPropertyValue('--card-body-lines'))
      const rootFontSize = parseFloat(style.fontSize)
      const maxPx = maxBody * rootFontSize
      setIsLong(el.scrollHeight > maxPx + 1)
    })
  }, [request.body])

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
    } catch { addToast(t('errors.networkError') as string, 'error') }
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

  const metaParts = [
    typeLabels[request.type],
    fandomTypeLabels[request.fandom_type],
    request.pairing !== 'any' ? pairingLabels[request.pairing] : null,
    contentLabels[request.content_level],
    languageLabels[request.language],
  ].filter(Boolean)

  return (
    <article className="card">
      {/* Header: meta + actions */}
      <div className="card-header">
        <div className="card-meta">
          {statusLabel && (
            <>
              <span className={`card-status ${statusActive ? 'card-status-active' : 'card-status-dim'}`}>
                {statusLabel}
              </span>
              <span className="sep" style={{ margin: '0 0.15rem' }}>|</span>
            </>
          )}
          {metaParts.map((label, i) => (
            <span key={i}>
              {i > 0 && <span className="sep">/</span>}
              {label}
            </span>
          ))}
        </div>
        <div className="card-actions">
          {isOwn && (
            <>
              <button
                onClick={createInvite}
                disabled={inviteLoading}
                title={t('card.copyInvite') as string}
                className={`action-link ${inviteLink ? 'bookmarked' : ''}`}
                aria-label={t('card.copyInvite') as string}
              >
                {inviteLoading
                  ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : inviteLink
                    ? <Check size={13} aria-hidden="true" />
                    : <Link2 size={13} aria-hidden="true" />
                }
              </button>
              <Link
                href={`/requests/${request.id}/edit`}
                title={t('card.edit') as string}
                className="action-link"
                aria-label={t('card.edit') as string}
              >
                <Pencil size={12} aria-hidden="true" />
              </Link>
            </>
          )}
          <button
            onClick={toggleBookmark}
            disabled={loadingBm}
            title={bookmarked ? t('card.removeBookmark') as string : t('card.addBookmark') as string}
            className={bookmarked ? 'bookmarked' : ''}
            aria-label={bookmarked ? t('card.removeBookmark') as string : t('card.addBookmark') as string}
          >
            <Star size={13} fill={bookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Title */}
      <Link href={`/requests/${request.id}`} className="card-title">
        {request.title}
      </Link>

      {/* User tags */}
      <div className="card-tags">
        {request.tags.map(tag => (
          <span key={tag} className="relative inline-flex">
            {hasTagMenu ? (
              <button
                type="button"
                onClick={e => openMenu(e, tag)}
                aria-haspopup="menu"
                aria-expanded={menuTag === tag}
                className={`tag tag-user cursor-pointer select-none
                  ${menuTag === tag ? '!border !border-accent !text-accent' : ''}`}
              >
                {tag.toLowerCase()}
              </button>
            ) : (
              <span className="tag tag-user select-none">
                {tag.toLowerCase()}
              </span>
            )}

            {menuTag === tag && (
              <div
                role="menu"
                onClick={e => e.stopPropagation()}
                className="absolute top-[calc(100%+3px)] left-0 z-200 bg-surface border border-edge min-w-[150px] shadow-[0_2px_10px_var(--shadow)]"
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

      {/* Body preview */}
      {request.body && (
        <>
          <div className={`relative ${isLong && !expanded ? '' : ''}`}>
            <div
              ref={bodyRef}
              className={`card-body break-words ${isLong && !expanded ? 'card-body-clamped' : ''}`}
              onClick={e => {
                // Spoiler reveal — single tag, harmless click handler stays
                // a div because the body itself contains arbitrary rich
                // text (links, headings) that cannot live inside a button.
                const el = e.target as HTMLElement
                if (el.classList.contains('ooc-spoiler')) {
                  el.classList.toggle('ooc-spoiler-open')
                }
              }}
              dangerouslySetInnerHTML={{ __html: request.body }}
            />
            {isLong && !expanded && <div className="card-body-fade" />}
          </div>
          {isLong && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={t('card.expand') as string}
              className="card-body-dots"
            >
              ···
            </button>
          )}
        </>
      )}

      {/* Invite link */}
      {inviteLink && (
        <div className="p-3 bg-surface-3 border border-edge">
          <code className="font-mono text-[0.78rem] text-accent break-all select-all">{inviteLink}</code>
        </div>
      )}

      {/* Footer */}
      {showRespond && (
        <div className="card-footer">
          {isOwn ? (
            <span className="card-own-label">
              {t('card.ownRequest') as string}
            </span>
          ) : (
            <>
              <div />
              <Link href={`/requests/${request.id}`} className="respond-pill">
                {t('card.respond') as string}
                <ChevronRight size={11} strokeWidth={2} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      )}
    </article>
  )
}
