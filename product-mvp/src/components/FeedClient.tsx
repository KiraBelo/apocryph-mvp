'use client'
import { useEffect, useState, useCallback } from 'react'
import RequestCard, { Request } from './RequestCard'
import Link from 'next/link'
import { useSettings, useT } from './SettingsContext'
import TagAutocomplete, { type TagItem } from './TagAutocomplete'
import { useToast } from './ToastProvider'
import SharedFilterSelect from './FilterSelect'

function FilterSelect(props: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <SharedFilterSelect {...props} variant="filter" />
}

interface Props {
  user: { id: string; email: string } | null
}

export default function FeedClient({ user }: Props) {
  const { tagPresets, setTagPreset } = useSettings()
  const t = useT()
  const { addToast } = useToast()

  const CONTENT_LEVELS = [
    { value: '', label: t('filters.anyNsfw') as string },
    { value: 'none', label: t('filters.noNsfw') as string },
    { value: 'rare', label: t('filters.nsfwRare') as string },
    { value: 'often', label: t('filters.nsfwOften') as string },
    { value: 'core', label: t('filters.nsfwCore') as string },
    { value: 'flexible', label: t('filters.nsfwFlexible') as string },
  ]

  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [fandomType, setFandomType] = useState('')
  const [pairing, setPairing] = useState('')
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('')
  const [filterTags, setFilterTags] = useState<TagItem[]>([])
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())
  const [blacklist, setBlacklist] = useState<string[]>([])
  const [blacklistInput, setBlacklistInput] = useState('')
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState(false)

  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetSlot, setPresetSlot] = useState(0)

  const tagsString = filterTags.map(t => t.slug).join(',')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams()
      if (q)          params.set('q', q)
      if (type)       params.set('type', type)
      if (fandomType) params.set('fandom_type', fandomType)
      if (pairing)    params.set('pairing', pairing)
      if (content)    params.set('content', content)
      if (language)   params.set('language', language)
      if (tagsString) params.set('tags', tagsString)
      params.set('page', String(page))
      const res = await fetch(`/api/requests?${params}`)
      const data = await res.json()
      setRequests(data.requests ?? [])
      setTotalPages(data.totalPages ?? 1)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [q, type, fandomType, pairing, content, language, tagsString, page])

  useEffect(() => { load() }, [load])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [q, type, fandomType, pairing, content, language, tagsString])

  useEffect(() => {
    if (!user) return
    fetch('/api/bookmarks').then(r => r.json()).then((rows: { id: string }[]) => {
      setBookmarked(new Set(rows.map(r => r.id)))
    }).catch(() => {}) // fire-and-forget: bookmarks are non-critical, feed works without them
  }, [user])

  useEffect(() => {
    if (!user) return
    fetch('/api/blacklist').then(r => r.json()).then((t: string[]) => {
      setBlacklist(t)
    }).catch(() => {}) // fire-and-forget: blacklist is non-critical, feed works without tag filtering
  }, [user])

  async function addToBlacklist(raw?: string) {
    const parts = (raw ?? blacklistInput).split(',').map(t => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean)
    const unique = parts.filter(t => !blacklist.includes(t))
    if (!unique.length) { setBlacklistInput(''); return }
    try {
      // Параллельные запросы вместо последовательных — UI не ждёт N*RTT.
      await Promise.all(unique.map(tag =>
        fetch('/api/blacklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag }),
        })
      ))
      setBlacklist(prev => [...prev, ...unique].sort())
      setBlacklistInput('')
      load()
    } catch { addToast(t('errors.networkError') as string, 'error') }
  }

  async function removeFromBlacklist(tag: string) {
    try {
      await fetch(`/api/blacklist/${encodeURIComponent(tag)}`, { method: 'DELETE' })
      setBlacklist(prev => prev.filter(t => t !== tag))
      load()
    } catch { addToast(t('errors.networkError') as string, 'error') }
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
    try {
      await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      })
      setBlacklist(prev => [...prev, tag].sort())
      load()
    } catch { addToast(t('errors.networkError') as string, 'error') }
  }

  function openSavePreset() {
    const firstEmpty = tagPresets.findIndex(p => !p.tags)
    setPresetSlot(firstEmpty >= 0 ? firstEmpty : 0)
    setPresetName('')
    setShowSavePreset(true)
  }

  function savePreset() {
    setTagPreset(presetSlot, {
      name: presetName.trim() || `${t('settings.presetName') as string} ${presetSlot + 1}`,
      tags: tagsString,
    })
    setShowSavePreset(false)
  }

  const hasPresets = tagPresets.some(p => p.tags)
  const showPresetPanel = hasPresets || showSavePreset

  return (
    <div className="max-w-[1050px] mx-auto px-7 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-2">{t('feed.sectionLabel') as string}</p>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="page-title text-[clamp(2rem,5vw,3rem)]">
            {t('feed.title') as string}
          </h1>
          {user && (
            <Link href="/requests/new" className="btn-primary text-[0.95rem] py-2 px-5 shrink-0">
              {t('feed.createRequest') as string}
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className={`flex flex-wrap gap-3 p-[0.75rem_1rem] bg-surface-2 border border-edge ${showPresetPanel || user ? '' : 'mb-5'}`}>
        <input
          type="search"
          placeholder={t('feed.searchPlaceholder') as string}
          value={q}
          onChange={e => setQ(e.target.value)}
          className="filter-input flex-[1_1_200px]"
        />
        <FilterSelect
          value={type}
          onChange={setType}
          options={[
            { value: '', label: t('filters.anyType') as string },
            { value: 'duo', label: t('filters.duo') as string },
            { value: 'multiplayer', label: t('filters.multiplayer') as string },
          ]}
        />
        <FilterSelect
          value={fandomType}
          onChange={setFandomType}
          options={[
            { value: '', label: t('filters.fandomAndOriginal') as string },
            { value: 'fandom', label: t('filters.fandom') as string },
            { value: 'original', label: t('filters.original') as string },
          ]}
        />
        <FilterSelect
          value={pairing}
          onChange={setPairing}
          options={[
            { value: '', label: t('filters.anyPairing') as string },
            { value: 'sl', label: 'M/M' },
            { value: 'fm', label: 'F/F' },
            { value: 'gt', label: 'M/F' },
            { value: 'multi', label: t('filters.multi') as string },
            { value: 'other', label: t('filters.other') as string },
            { value: 'any', label: t('filters.notImportant') as string },
          ]}
        />
        <FilterSelect
          value={content}
          onChange={setContent}
          options={CONTENT_LEVELS}
        />
        <FilterSelect
          value={language}
          onChange={setLanguage}
          options={[
            { value: '', label: t('filters.anyLanguage') as string },
            { value: 'ru', label: t('filters.langRu') as string },
            { value: 'en', label: t('filters.langEn') as string },
          ]}
        />
        <TagAutocomplete
          selectedTags={filterTags}
          onTagsChange={setFilterTags}
          maxTags={10}
          allowCreate={false}
          placeholder={t('feed.filterTagsPlaceholder') as string}
          className="flex-[1_1_250px] min-w-0"
          chipsOutside
        />
        <button onClick={load} className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5">
          {t('feed.find') as string}
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
                className="ml-0.5 opacity-50 hover:opacity-100 cursor-pointer chip-close"
              >
                ×
              </button>
            </span>
          ))}
          {user && (
            <button
              onClick={openSavePreset}
              title={t('feed.saveAsPreset') as string}
              className="tag-chip tag-chip-action flex items-center cursor-pointer transition-opacity"
            >
              +
            </button>
          )}
          <button
            onClick={() => setFilterTags([])}
            className="tag-chip tag-chip-action flex items-center cursor-pointer transition-opacity"
          >
            {t('feed.clearAll') as string} ×
          </button>
        </div>
      )}

      {/* Preset panel */}
      {showPresetPanel && (
        <div className={`bg-surface-2 border border-edge border-t-0 ${user ? '' : 'mb-5'}`}>
          {hasPresets && (
            <div className={`px-6 py-2 flex items-center gap-2 flex-wrap ${showSavePreset ? 'border-b border-edge' : ''}`}>
              <span className="font-mono text-[0.6rem] tracking-[0.18em] uppercase text-accent-2 shrink-0">
                {t('feed.presets') as string}
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
                  {p.name || `${t('settings.presetName') as string} ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {showSavePreset && (
            <div className="px-6 py-3">
              <p className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-ink-2 mb-2.5">
                {t('feed.savePreset') as string} <span className="text-accent">{tagsString}</span>
              </p>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="text"
                  placeholder={t('feed.presetNamePlaceholder') as string}
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') savePreset() }}
                  className="filter-input flex-[1_1_140px] text-[0.85rem]"
                  autoFocus
                />
                <div className="flex gap-[0.3rem] items-center shrink-0">
                  <span className="font-mono text-[0.6rem] tracking-[0.1em] text-ink-2 mr-0.5">{t('feed.slot') as string}</span>
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
                  {t('feed.saveButton') as string}
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
        <div className="mb-5 bg-surface-2 border border-edge border-t-0">
          <div className="flex items-center justify-between px-6 py-2">
            <button
              onClick={() => setIsBlacklistOpen(o => !o)}
              className="flex items-center gap-2 bg-transparent border-none cursor-pointer font-mono text-[0.65rem] tracking-[0.15em] uppercase text-ink-2 p-0"
            >
              <span>{t('feed.hiddenTags') as string}{blacklist.length > 0 ? ` (${blacklist.length})` : ''}</span>
              <span className="text-[0.55rem] opacity-50">{isBlacklistOpen ? '▲' : '▼'}</span>
            </button>
            {isBlacklistOpen && blacklist.length > 0 && (
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/blacklist', { method: 'DELETE' })
                    setBlacklist([])
                    load()
                  } catch { addToast(t('errors.networkError') as string, 'error') }
                }}
                className="bg-transparent border-none cursor-pointer font-mono text-[0.6rem] tracking-[0.1em] uppercase text-ink-2 p-0 opacity-50 hover:opacity-100"
              >
                {t('feed.clearBlacklist') as string}
              </button>
            )}
          </div>

          {isBlacklistOpen && (
            <div className="px-6 py-3 pb-4 border-t border-edge flex flex-col gap-2">
              <input
                type="text"
                placeholder={t('feed.blacklistPlaceholder') as string}
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
                        title={t('feed.removeFromBlacklist') as string}
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
        <div className="grid gap-[var(--game-gap,1rem)]" aria-busy="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="card p-5" style={{ animation: `fadeInUp 0.3s ease ${i * 0.1}s both` }}>
              <div className="flex justify-between items-start mb-3">
                <div className="skeleton-block" style={{ width: '70%', height: '1.2rem' }} />
                <div className="skeleton-block" style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%' }} />
              </div>
              <div className="flex gap-2 mb-3">
                {[40, 55, 45, 50].map((w, j) => (
                  <div key={j} className="skeleton-block" style={{ width: `${w}px`, height: '1.1rem', borderRadius: '2px' }} />
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <div className="skeleton-block" style={{ width: '100%', height: '0.85rem' }} />
                <div className="skeleton-block" style={{ width: '85%', height: '0.85rem' }} />
                <div className="skeleton-block" style={{ width: '60%', height: '0.85rem' }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-ink-2 italic font-heading text-[1.1rem]">
          {t('errors.networkError') as string}
        </p>
      ) : requests.length === 0 ? (
        <p className="text-ink-2 italic font-heading text-[1.1rem]">
          {t('feed.noResults') as string}
        </p>
      ) : (
        <>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                disabled={page <= 1}
                className="btn-ghost text-[0.8rem] py-1.5 px-3 disabled:opacity-30 disabled:cursor-default"
              >
                {t('feed.prevPage') as string}
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
                    <span key={`dots-${i}`} className="text-ink-2 text-[0.8rem] px-1">...</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => { setPage(item); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      className={`font-mono text-[0.8rem] w-[32px] h-[32px] flex items-center justify-center cursor-pointer border
                        ${page === item
                          ? 'border-accent bg-accent-dim text-accent'
                          : 'border-edge bg-transparent text-ink-2 hover:border-accent hover:text-accent'}`}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                disabled={page >= totalPages}
                className="btn-ghost text-[0.8rem] py-1.5 px-3 disabled:opacity-30 disabled:cursor-default"
              >
                {t('feed.nextPage') as string}
              </button>
            </div>
          )}
        </>
      )}

      {!user && (
        <div className="mt-12 p-8 border border-edge text-center">
          <p className="font-heading text-[1.1rem] italic text-ink mb-4">
            {t('feed.loginPrompt') as string}
          </p>
          <Link href="/auth/register" className="btn-primary text-[0.95rem] py-2.5 px-6 inline-block">
            {t('feed.registerPrompt') as string}
          </Link>
        </div>
      )}
    </div>
  )
}
