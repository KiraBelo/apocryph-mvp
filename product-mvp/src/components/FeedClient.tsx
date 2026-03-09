'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import RequestCard, { Request } from './RequestCard'
import Link from 'next/link'
import { useSettings } from './SettingsContext'
import TagAutocomplete, { type TagItem } from './TagAutocomplete'

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
    <div ref={ref} className="relative min-w-[130px]">
      <button
        onClick={() => setOpen(o => !o)}
        className={`filter-input w-full flex items-center justify-between gap-2 cursor-pointer pr-3.5 ${open ? 'border-accent' : ''}`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {selected.label}
        </span>
        <span className="text-[0.5rem] opacity-60 shrink-0">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+2px)] left-0 right-0 z-100 bg-surface border border-accent shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`block w-full py-[0.45rem] px-3 border-none font-body text-[0.9rem] text-left cursor-pointer transition-[background,color] duration-100
                ${o.value === value ? 'bg-accent-dim text-accent' : 'bg-transparent text-ink hover:bg-accent hover:text-white'}`}
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
  { value: 'rare', label: 'NSFW редко' },
  { value: 'often', label: 'NSFW часто' },
  { value: 'core', label: 'NSFW основа сюжета' },
  { value: 'flexible', label: 'NSFW по договорённости' },
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
  const [filterTags, setFilterTags] = useState<TagItem[]>([])
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())
  const [blacklist, setBlacklist] = useState<string[]>([])
  const [blacklistInput, setBlacklistInput] = useState('')
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false)

  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetSlot, setPresetSlot] = useState(0)

  const tagsString = filterTags.map(t => t.slug).join(',')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q)          params.set('q', q)
    if (type)       params.set('type', type)
    if (fandomType) params.set('fandom_type', fandomType)
    if (pairing)    params.set('pairing', pairing)
    if (content)    params.set('content', content)
    if (tagsString) params.set('tags', tagsString)
    const res = await fetch(`/api/requests?${params}`)
    setRequests(await res.json())
    setLoading(false)
  }, [q, type, fandomType, pairing, content, tagsString])

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

  async function addToBlacklist(raw?: string) {
    const parts = (raw ?? blacklistInput).split(',').map(t => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean)
    const unique = parts.filter(t => !blacklist.includes(t))
    if (!unique.length) { setBlacklistInput(''); return }
    for (const tag of unique) {
      await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      })
    }
    setBlacklist(prev => [...prev, ...unique].sort())
    setBlacklistInput('')
    load()
  }

  async function removeFromBlacklist(tag: string) {
    await fetch(`/api/blacklist/${encodeURIComponent(tag)}`, { method: 'DELETE' })
    setBlacklist(prev => prev.filter(t => t !== tag))
    load()
  }

  function handleTagSearch(tag: string) {
    setFilterTags([{ slug: tag, name: tag }])
  }

  function handleTagSubscribe(tag: string) {
    setFilterTags(prev => {
      if (prev.some(t => t.slug === tag)) return prev
      return [...prev, { slug: tag, name: tag }]
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

  function openSavePreset() {
    const firstEmpty = tagPresets.findIndex(p => !p.tags)
    setPresetSlot(firstEmpty >= 0 ? firstEmpty : 0)
    setPresetName('')
    setShowSavePreset(true)
  }

  function savePreset() {
    setTagPreset(presetSlot, {
      name: presetName.trim() || `Набор ${presetSlot + 1}`,
      tags: tagsString,
    })
    setShowSavePreset(false)
  }

  const hasPresets = tagPresets.some(p => p.tags)
  const showPresetPanel = hasPresets || showSavePreset

  return (
    <div className="max-w-[1050px] mx-auto px-7 py-12">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-10 gap-4">
        <div>
          <p className="section-label mb-2">§ Лента заявок</p>
          <h1 className="page-title text-[clamp(2rem,5vw,3rem)]">
            Найди соигрока
          </h1>
        </div>
        {user && (
          <Link href="/requests/new" className="btn-primary text-[0.95rem] py-2 px-5 shrink-0">
            + Создать заявку
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className={`flex flex-wrap gap-3 p-[1.25rem_1.5rem] bg-surface-2 border border-edge ${showPresetPanel || user ? '' : 'mb-8'}`}>
        <input
          type="search"
          placeholder="Поиск по тексту..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="filter-input flex-[1_1_200px]"
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
        <div className="flex gap-1.5 flex-[1_1_250px] items-center">
          <TagAutocomplete
            selectedTags={filterTags}
            onTagsChange={setFilterTags}
            maxTags={10}
            allowCreate={false}
            placeholder="Фильтр по тегам..."
            className="flex-1 min-w-0"
            chipsOutside
          />
          <button
            onClick={openSavePreset}
            disabled={!tagsString}
            title={tagsString ? 'Сохранить как набор тегов' : 'Введите теги для сохранения'}
            className="btn-ghost text-[0.85rem] tracking-normal py-1.5 px-2.5 shrink-0 leading-none"
            style={{ opacity: tagsString ? 1 : 0.35, cursor: tagsString ? 'pointer' : 'default' }}
          >
            +
          </button>
        </div>
        <button onClick={load} className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5">
          Найти
        </button>
      </div>
      {/* Filter tag chips — full width */}
      {filterTags.length > 0 && (
        <div className="flex flex-wrap gap-[0.4rem] px-[1.5rem] pb-[1rem] -mt-1 bg-surface-2 border-x border-b border-edge">
          {filterTags.map(tag => (
            <span
              key={tag.slug}
              className="tag-chip flex items-center gap-1"
              style={{
                borderLeft: `2px solid ${({'fandom':'var(--accent)','genre':'#6a9fb5','trope':'#b58900','setting':'#859900','character_type':'#d33682','pairing':'#e040a0','mood':'#cb4b16','format':'#2aa198'}[tag.category || 'other'] || 'var(--text-2)')}`,
              }}
            >
              {tag.name || tag.slug}
              <button
                type="button"
                onClick={() => setFilterTags(filterTags.filter(t => t.slug !== tag.slug))}
                className="ml-0.5 opacity-50 hover:opacity-100 cursor-pointer"
                style={{ fontSize: '0.8rem', lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Preset panel */}
      {showPresetPanel && (
        <div className={`bg-surface-2 border border-edge border-t-0 ${user ? '' : 'mb-8'}`}>
          {hasPresets && (
            <div className={`px-6 py-2 flex items-center gap-2 flex-wrap ${showSavePreset ? 'border-b border-edge' : ''}`}>
              <span className="font-mono text-[0.6rem] tracking-[0.18em] uppercase text-accent-2 shrink-0">
                § Наборы
              </span>
              {tagPresets.map((p, i) => p.tags && (
                <button
                  key={i}
                  onClick={() => {
                    setFilterTags(p.tags.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ slug: s, name: s })))
                    setShowSavePreset(false)
                  }}
                  className="preset-chip"
                >
                  {p.name || `Набор ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {showSavePreset && (
            <div className="px-6 py-3">
              <p className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-ink-2 mb-2.5">
                Сохранить набор: <span className="text-accent">{tagsString}</span>
              </p>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="text"
                  placeholder="Название набора..."
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') savePreset() }}
                  className="filter-input flex-[1_1_140px] text-[0.85rem]"
                  autoFocus
                />
                <div className="flex gap-[0.3rem] items-center shrink-0">
                  <span className="font-mono text-[0.6rem] tracking-[0.1em] text-ink-2 mr-0.5">СЛОТ</span>
                  {[0, 1, 2].map(i => (
                    <button
                      key={i}
                      onClick={() => setPresetSlot(i)}
                      className={`font-mono text-[0.68rem] w-[26px] h-[26px] flex items-center justify-center cursor-pointer border
                        ${presetSlot === i
                          ? 'border-accent bg-accent-dim text-accent'
                          : 'border-edge bg-transparent text-ink-2'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button onClick={savePreset} className="btn-primary text-[0.9rem] py-[0.3rem] px-3.5 shrink-0">
                  Сохранить →
                </button>
                <button
                  onClick={() => setShowSavePreset(false)}
                  className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.9rem] shrink-0 p-[0.1rem_0.25rem]"
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
        <div className="mb-8 bg-surface-2 border border-edge border-t-0">
          <div className="flex items-center justify-between px-6 py-2">
            <button
              onClick={() => setIsBlacklistOpen(o => !o)}
              className="flex items-center gap-2 bg-transparent border-none cursor-pointer font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink-2 p-0"
            >
              <span>Скрытые теги{blacklist.length > 0 ? ` (${blacklist.length})` : ''}</span>
              <span className="text-[0.55rem] opacity-50">{isBlacklistOpen ? '▲' : '▼'}</span>
            </button>
            {isBlacklistOpen && blacklist.length > 0 && (
              <button
                onClick={async () => {
                  await fetch('/api/blacklist', { method: 'DELETE' })
                  setBlacklist([])
                  load()
                }}
                className="bg-transparent border-none cursor-pointer font-mono text-[0.6rem] tracking-[0.1em] uppercase text-ink-2 p-0 opacity-50 hover:opacity-100"
              >
                Очистить
              </button>
            )}
          </div>

          {isBlacklistOpen && (
            <div className="px-6 py-3 pb-4 border-t border-edge flex flex-col gap-2">
              <input
                type="text"
                placeholder="Теги через запятую или Enter"
                value={blacklistInput}
                onChange={e => {
                  const v = e.target.value
                  if (v.includes(',')) { addToBlacklist(v); return }
                  setBlacklistInput(v)
                }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addToBlacklist() } }}
                className="filter-input w-full"
                autoFocus
              />
              {blacklist.length > 0 && (
                <div className="max-h-[180px] overflow-y-auto flex flex-wrap gap-1.5 items-start">
                  {blacklist.map(tag => (
                    <span key={tag} className="blacklist-chip">
                      {tag}
                      <button
                        onClick={() => removeFromBlacklist(tag)}
                        title="Убрать из чёрного списка"
                        className="bg-transparent border-none cursor-pointer text-accent text-[0.8rem] leading-none p-0"
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <p className="text-ink-2 italic font-heading">Загрузка...</p>
      ) : requests.length === 0 ? (
        <p className="text-ink-2 italic font-heading text-[1.1rem]">
          Заявок не найдено. Попробуй изменить фильтры или создай свою.
        </p>
      ) : (
        <div className="grid gap-[var(--game-gap,1rem)]">
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
        <div className="mt-12 p-8 border border-edge text-center">
          <p className="font-heading text-[1.1rem] italic text-ink mb-4">
            Войди, чтобы отвечать на заявки и создавать свои
          </p>
          <Link href="/auth/register" className="btn-primary text-[0.95rem] py-2.5 px-6 inline-block">
            Зарегистрироваться →
          </Link>
        </div>
      )}
    </div>
  )
}
