'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import RequestCard, { Request } from './RequestCard'
import Link from 'next/link'
import { useSettings } from './SettingsContext'

function FilterSelect({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: '130px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          ...filterInput,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          cursor: 'pointer',
          paddingRight: '0.9rem',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.label}
        </span>
        <span style={{ fontSize: '0.5rem', opacity: 0.6, flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 2px)',
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--bg)',
          border: '1px solid var(--accent)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.45rem 0.75rem',
                background: o.value === value ? 'var(--accent-dim)' : 'none',
                border: 'none',
                color: o.value === value ? 'var(--accent)' : 'var(--text)',
                fontFamily: 'var(--serif-body)',
                fontSize: '0.9rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={e => {
                if (o.value !== value) {
                  e.currentTarget.style.background = 'var(--accent)'
                  e.currentTarget.style.color = '#fff'
                }
              }}
              onMouseLeave={e => {
                if (o.value !== value) {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = 'var(--text)'
                }
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const CONTENT_LEVELS = [
  { value: '', label: 'Любой NSFW' },
  { value: 'none', label: 'Без постельных сцен' },
  { value: 'rare', label: 'Редко' },
  { value: 'often', label: 'Часто' },
  { value: 'core', label: 'Основа сюжета' },
  { value: 'flexible', label: 'По договорённости' },
]

interface Props {
  user: { id: string; email: string } | null
}

export default function FeedClient({ user }: Props) {
  const { tagPresets, setTagPreset } = useSettings()

  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [fandomType, setFandomType] = useState('')
  const [pairing, setPairing] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())
  const [blacklist, setBlacklist] = useState<string[]>([])
  const [blacklistInput, setBlacklistInput] = useState('')
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false)

  // Save-preset form state
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetSlot, setPresetSlot] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q)          params.set('q', q)
    if (type)       params.set('type', type)
    if (fandomType) params.set('fandom_type', fandomType)
    if (pairing)    params.set('pairing', pairing)
    if (content)    params.set('content', content)
    if (tags)       params.set('tags', tags)
    const res = await fetch(`/api/requests?${params}`)
    setRequests(await res.json())
    setLoading(false)
  }, [q, type, fandomType, pairing, content, tags])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!user) return
    fetch('/api/bookmarks').then(r => r.json()).then((rows: { id: string }[]) => {
      setBookmarked(new Set(rows.map(r => r.id)))
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    fetch('/api/blacklist').then(r => r.json()).then((t: string[]) => {
      setBlacklist(t)
    })
  }, [user])

  async function addToBlacklist() {
    const tag = blacklistInput.trim().toLowerCase()
    if (!tag || blacklist.includes(tag)) { setBlacklistInput(''); return }
    await fetch('/api/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    })
    setBlacklist(prev => [...prev, tag].sort())
    setBlacklistInput('')
    setIsBlacklistOpen(false)
    load()
  }

  async function removeFromBlacklist(tag: string) {
    await fetch(`/api/blacklist/${encodeURIComponent(tag)}`, { method: 'DELETE' })
    setBlacklist(prev => prev.filter(t => t !== tag))
    load()
  }

  function handleTagSearch(tag: string) {
    setTags(tag)
  }

  function handleTagSubscribe(tag: string) {
    setTags(prev => {
      const current = prev.split(',').map(t => t.trim()).filter(Boolean)
      if (current.includes(tag)) return prev
      return current.length ? current.join(', ') + ', ' + tag : tag
    })
  }

  async function handleTagBlacklist(tag: string) {
    if (blacklist.includes(tag)) return
    await fetch('/api/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    })
    setBlacklist(prev => [...prev, tag].sort())
    load()
  }

  const tagsList = tags.split(',').map(t => t.trim()).filter(Boolean)

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,+$/, '').trim().toLowerCase()
    if (!tag) return
    const current = tags.split(',').map(t => t.trim()).filter(Boolean)
    if (current.includes(tag)) { setTagInput(''); return }
    const next = [...current, tag].join(', ')
    setTags(next)
    setTagInput('')
  }

  function removeTag(tag: string) {
    const current = tags.split(',').map(t => t.trim()).filter(Boolean)
    setTags(current.filter(t => t !== tag).join(', '))
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
    if (e.key === 'Backspace' && !tagInput && tagsList.length > 0) {
      removeTag(tagsList[tagsList.length - 1])
    }
  }

  function openSavePreset() {
    const firstEmpty = tagPresets.findIndex(p => !p.tags)
    setPresetSlot(firstEmpty >= 0 ? firstEmpty : 0)
    setPresetName('')
    setShowSavePreset(true)
  }

  function savePreset() {
    setTagPreset(presetSlot, {
      name: presetName.trim() || `Набор ${presetSlot + 1}`,
      tags: tags.trim(),
    })
    setShowSavePreset(false)
  }

  const hasPresets = tagPresets.some(p => p.tags)
  const showPresetPanel = hasPresets || showSavePreset

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '3rem 1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '2.5rem', gap: '1rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '0.5rem' }}>
            § Лента заявок
          </p>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text)' }}>
            Найди соигрока
          </h1>
        </div>
        {user && (
          <Link href="/requests/new" style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.95rem', background: 'var(--accent)', color: '#fff', padding: '0.55rem 1.25rem', flexShrink: 0 }}>
            + Создать заявку
          </Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '1.25rem 1.5rem', background: 'var(--bg-2)', border: '1px solid var(--border)', marginBottom: showPresetPanel || user ? 0 : '2rem' }}>
        <input
          type="search"
          placeholder="Поиск по тексту..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ ...filterInput, flex: '1 1 200px' }}
        />
        <FilterSelect
          value={type}
          onChange={setType}
          options={[
            { value: '', label: 'Любой тип' },
            { value: 'duo', label: 'На двоих' },
            { value: 'multiplayer', label: 'Мультиплеер' },
          ]}
        />
        <FilterSelect
          value={fandomType}
          onChange={setFandomType}
          options={[
            { value: '', label: 'Фандом и оридж' },
            { value: 'fandom', label: 'Фандом' },
            { value: 'original', label: 'Оридж' },
          ]}
        />
        <FilterSelect
          value={pairing}
          onChange={setPairing}
          options={[
            { value: '', label: 'Любой пейринг' },
            { value: 'sl', label: 'M/M' },
            { value: 'fm', label: 'F/F' },
            { value: 'gt', label: 'M/F' },
            { value: 'multi', label: 'Мульти' },
            { value: 'other', label: 'Другое' },
            { value: 'any', label: 'Не важно' },
          ]}
        />
        <FilterSelect
          value={content}
          onChange={setContent}
          options={CONTENT_LEVELS}
        />
        <div style={{ display: 'flex', gap: '0.4rem', flex: '1 1 160px' }}>
          <input
            type="text"
            placeholder="Добавить тег..."
            value={tagInput}
            onChange={e => {
              const v = e.target.value
              if (v.includes(',')) { addTag(v); return }
              setTagInput(v)
            }}
            onKeyDown={handleTagInputKeyDown}
            style={{ ...filterInput, flex: 1, minWidth: 0 }}
          />
          <button
            onClick={openSavePreset}
            disabled={!tags.trim()}
            title={tags.trim() ? 'Сохранить как набор тегов' : 'Введите теги для сохранения'}
            style={{
              fontFamily: 'var(--mono)', fontSize: '0.85rem', letterSpacing: 0,
              background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)',
              padding: '0.4rem 0.6rem', cursor: tags.trim() ? 'pointer' : 'default',
              opacity: tags.trim() ? 1 : 0.35, flexShrink: 0, lineHeight: 1,
            }}
          >
            +
          </button>
        </div>
        <button onClick={load} style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '0.4rem 0.9rem', cursor: 'pointer' }}>
          Найти
        </button>
      </div>

      {/* Active tag chips */}
      {tagsList.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center',
          padding: '0.6rem 1.5rem',
          background: 'var(--bg-2)', border: '1px solid var(--border)', borderTop: 'none',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-2)', marginRight: '0.25rem' }}>
            Теги:
          </span>
          {tagsList.map(tag => (
            <span key={tag} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.05em',
              padding: '0.2rem 0.55rem', background: 'rgba(180, 100, 120, 0.08)', border: '1px solid rgba(180, 100, 120, 0.3)',
              color: 'var(--text)',
            }}>
              #{tag}
              <button
                onClick={() => removeTag(tag)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '0.8rem', lineHeight: 1, padding: 0, opacity: 0.7 }}
              >×</button>
            </span>
          ))}
        </div>
      )}

      {/* Preset panel: chips + save form */}
      {showPresetPanel && (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderTop: 'none', marginBottom: user ? 0 : '2rem' }}>
          {/* Preset chips row */}
          {hasPresets && (
            <div style={{
              padding: '0.5rem 1.5rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
              borderBottom: showSavePreset ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-2)', flexShrink: 0 }}>
                § Наборы
              </span>
              {tagPresets.map((p, i) => p.tags && (
                <button
                  key={i}
                  onClick={() => { setTags(p.tags); setShowSavePreset(false) }}
                  style={{
                    fontFamily: 'var(--mono)', fontSize: '0.65rem', letterSpacing: '0.07em',
                    background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)',
                    padding: '0.2rem 0.65rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)' }}
                >
                  {p.name || `Набор ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Save form */}
          {showSavePreset && (
            <div style={{ padding: '0.75rem 1.5rem' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.6rem' }}>
                Сохранить набор: <span style={{ color: 'var(--accent)', fontStyle: 'normal' }}>{tags}</span>
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Название набора..."
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') savePreset() }}
                  style={{ ...filterInput, flex: '1 1 140px', fontSize: '0.85rem' }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-2)', marginRight: '0.1rem' }}>СЛОТ</span>
                  {[0, 1, 2].map(i => (
                    <button
                      key={i}
                      onClick={() => setPresetSlot(i)}
                      style={{
                        fontFamily: 'var(--mono)', fontSize: '0.68rem',
                        width: '26px', height: '26px', border: `1px solid ${presetSlot === i ? 'var(--accent)' : 'var(--border)'}`,
                        background: presetSlot === i ? 'var(--accent-dim)' : 'none',
                        color: presetSlot === i ? 'var(--accent)' : 'var(--text-2)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={savePreset}
                  style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.9rem', background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.3rem 0.9rem', cursor: 'pointer', flexShrink: 0 }}
                >
                  Сохранить →
                </button>
                <button
                  onClick={() => setShowSavePreset(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0, padding: '0.1rem 0.25rem' }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Blacklist panel */}
      {user && (
        <div style={{ marginBottom: '2rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderTop: 'none' }}>
          {/* Collapsible header */}
          <button
            onClick={() => setIsBlacklistOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-2)' }}
          >
            <span>Скрытые теги{blacklist.length > 0 ? ` (${blacklist.length})` : ''}</span>
            <span style={{ fontSize: '0.55rem', opacity: 0.5, marginRight: '0.35rem' }}>{isBlacklistOpen ? '▲' : '▼'}</span>
          </button>

          {/* Expanded body */}
          {isBlacklistOpen && (
            <div style={{ padding: '0.75rem 1.5rem 1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'flex-start' }}>
                {blacklist.map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.06em', padding: '0.2rem 0.5rem', background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', flexShrink: 0 }}>
                    #{tag}
                    <button
                      onClick={() => removeFromBlacklist(tag)}
                      title="Убрать из чёрного списка"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.8rem', lineHeight: 1, padding: 0 }}
                    >×</button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="+ тег"
                  value={blacklistInput}
                  onChange={e => setBlacklistInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addToBlacklist() }}
                  style={{ ...filterInput, width: '90px', minWidth: 'unset', fontSize: '0.8rem', padding: '0.2rem 0.5rem', flexShrink: 0 }}
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <p style={{ color: 'var(--text-2)', fontStyle: 'italic', fontFamily: 'var(--serif)' }}>Загрузка...</p>
      ) : requests.length === 0 ? (
        <p style={{ color: 'var(--text-2)', fontStyle: 'italic', fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>
          Заявок не найдено. Попробуй изменить фильтры или создай свою.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--game-gap, 1rem)' }}>
          {requests.map(r => (
            <RequestCard
              key={r.id}
              request={r}
              isBookmarked={bookmarked.has(r.id)}
              showRespond={!!user}
              isOwn={!!user && r.author_id === user.id}
              onBookmark={(id, state) => {
                const next = new Set(bookmarked)
                state ? next.add(id) : next.delete(id)
                setBookmarked(next)
              }}
              onTagSearch={user ? handleTagSearch : undefined}
              onTagSubscribe={user ? handleTagSubscribe : undefined}
              onTagBlacklist={user ? handleTagBlacklist : undefined}
            />
          ))}
        </div>
      )}

      {!user && (
        <div style={{ marginTop: '3rem', padding: '2rem', border: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--text)', marginBottom: '1rem' }}>
            Войди, чтобы отвечать на заявки и создавать свои
          </p>
          <Link href="/auth/register" style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', background: 'var(--accent)', color: '#fff', padding: '0.6rem 1.5rem' }}>
            Зарегистрироваться →
          </Link>
        </div>
      )}
    </div>
  )
}

const filterInput: React.CSSProperties = {
  backgroundColor: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontFamily: 'var(--serif-body)',
  fontSize: '0.9rem',
  padding: '0.45rem 0.75rem',
  outline: 'none',
  minWidth: '130px',
}

