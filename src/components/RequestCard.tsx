'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export interface Request {
  id: string
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

const contentLabels: Record<string, string> = {
  none: 'без постельных сцен',
  rare: 'редко',
  often: 'часто',
  core: 'основа сюжета',
  flexible: 'по договорённости',
}

const typeLabels: Record<string, string> = {
  duo: 'На двоих',
  multiplayer: 'Мультиплеер',
}

const fandomTypeLabels: Record<string, string> = {
  fandom: 'Фандом',
  original: 'Оридж',
}

const pairingLabels: Record<string, string> = {
  sl: 'M/M',
  fm: 'F/F',
  gt: 'M/F',
  any: 'Любой пейринг',
  multi: 'Мульти',
  other: 'Другое',
}

interface Props {
  request: Request
  isBookmarked?: boolean
  onBookmark?: (id: string, isBookmarked: boolean) => void
  showRespond?: boolean
  onTagSearch?: (tag: string) => void
  onTagSubscribe?: (tag: string) => void
  onTagBlacklist?: (tag: string) => void
}

export default function RequestCard({
  request, isBookmarked, onBookmark, showRespond = true,
  onTagSearch, onTagSubscribe, onTagBlacklist,
}: Props) {
  const [bookmarked, setBookmarked] = useState(isBookmarked ?? false)
  const [loadingBm, setLoadingBm] = useState(false)
  const [menuTag, setMenuTag] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const isLong = !!request.body && request.body.length > 1500

  const hasTagMenu = !!(onTagSearch || onTagSubscribe || onTagBlacklist)

  // Закрыть меню при клике вне карточки
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
    await fetch(`/api/bookmarks/${request.id}`, { method })
    setBookmarked(b => !b)
    onBookmark?.(request.id, !bookmarked)
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
    <article
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '1.75rem', transition: 'border-color 0.2s', position: 'relative' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
        <Link href={`/requests/${request.id}`}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1.3, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            {request.title}
          </h3>
        </Link>
        <button onClick={toggleBookmark} disabled={loadingBm} title={bookmarked ? 'Убрать из закладок' : 'В закладки'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: bookmarked ? 'var(--accent)' : 'var(--border)', flexShrink: 0, padding: 0, lineHeight: 1 }}
        >
          {bookmarked ? '★' : '☆'}
        </button>
      </div>

      {/* Tags row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
        <span style={badgeStyle('type')}>{typeLabels[request.type]}</span>
        <span style={badgeStyle('fandom')}>{fandomTypeLabels[request.fandom_type]}</span>
        {request.pairing !== 'any' && <span style={badgeStyle('pairing')}>{pairingLabels[request.pairing]}</span>}
        <span style={badgeStyle('content')}>{contentLabels[request.content_level]}</span>
        {request.tags.map(tag => (
          <span key={tag} style={{ position: 'relative', display: 'inline-flex' }}>
            <span
              onClick={hasTagMenu ? e => openMenu(e, tag) : undefined}
              style={{
                ...badgeStyle('tag'),
                cursor: hasTagMenu ? 'pointer' : 'default',
                userSelect: 'none',
                ...(menuTag === tag ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}),
              }}
            >
              #{tag}
            </span>

            {/* Dropdown menu */}
            {menuTag === tag && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  zIndex: 200,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  minWidth: '190px',
                  boxShadow: '0 4px 16px var(--shadow)',
                }}
              >
                {onTagSearch && (
                  <button onClick={e => runAction(e, () => onTagSearch(tag))} style={menuItem}>
                    Поиск по тегу
                  </button>
                )}
                {onTagSubscribe && (
                  <button onClick={e => runAction(e, () => onTagSubscribe(tag))} style={menuItem}>
                    Добавить к поиску
                  </button>
                )}
                {onTagBlacklist && (
                  <button onClick={e => runAction(e, () => onTagBlacklist(tag))} style={{ ...menuItem, borderTop: '1px solid var(--border)', color: 'var(--accent)' }}>
                    Скрыть тег
                  </button>
                )}
              </div>
            )}
          </span>
        ))}
      </div>

      {/* Preview */}
      {request.body && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                color: 'var(--text-2)', fontSize: '0.95rem', lineHeight: 1.7,
                overflow: 'hidden',
                maxHeight: isLong && !expanded ? '17rem' : 'none',
                overflowWrap: 'break-word', wordBreak: 'break-word',
              }}
              dangerouslySetInnerHTML={{ __html: request.body }}
            />
            {isLong && !expanded && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '2.5rem',
                background: 'linear-gradient(to bottom, transparent, var(--bg-2))',
                pointerEvents: 'none',
              }} />
            )}
          </div>
          {isLong && (
            <button
              onClick={e => { e.preventDefault(); setExpanded(x => !x) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem 0 0',
                fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--accent)', display: 'block',
              }}
            >
              {expanded ? 'Свернуть ↑' : 'Читать дальше →'}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      {showRespond && (
        <Link href={`/requests/${request.id}`}
          style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', textDecoration: 'none' }}
        >
          Ответить →
        </Link>
      )}
    </article>
  )
}

function badgeStyle(variant: 'type' | 'fandom' | 'pairing' | 'content' | 'tag'): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.08em',
    textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid',
  }
  if (variant === 'type')    return { ...base, color: 'var(--accent)', borderColor: 'var(--accent-dim)', background: 'transparent' }
  if (variant === 'fandom')  return { ...base, color: 'var(--accent-2)', borderColor: 'var(--accent-2)', background: 'transparent' }
  if (variant === 'pairing') return { ...base, color: 'var(--accent-2)', borderColor: 'var(--accent-2)', background: 'transparent' }
  if (variant === 'content') return { ...base, color: 'var(--text-2)', borderColor: 'var(--border)', background: 'transparent' }
  return { ...base, color: 'var(--text-2)', borderColor: 'transparent', background: 'var(--bg-3)' }
}

const menuItem: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem 0.85rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'var(--serif-body)',
  fontSize: '0.88rem',
  color: 'var(--text)',
  lineHeight: 1.5,
}
