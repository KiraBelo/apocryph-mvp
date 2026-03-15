'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useT } from './SettingsContext'
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

  return (
    <div ref={ref} className="relative min-w-[130px]">
      <button
        onClick={() => setOpen(o => !o)}
        className={`filter-input w-full flex items-center justify-between gap-2 cursor-pointer pr-3.5 ${open ? 'border-accent' : ''}`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{selected.label}</span>
        <span className="text-[0.5rem] opacity-60 shrink-0">{open ? '▲' : '▼'}</span>
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

interface PublicGame {
  id: string
  published_at: string
  banner_url: string | null
  request_title: string | null
  request_type: string | null
  request_fandom_type: string | null
  request_pairing: string | null
  request_content_level: string | null
  request_tags: string[] | null
  ic_count: string
  participants: { nickname: string; avatar_url: string | null }[]
}

export default function LibraryClient() {
  const t = useT()
  const [games, setGames] = useState<PublicGame[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [fandomType, setFandomType] = useState('')
  const [pairing, setPairing] = useState('')
  const [content, setContent] = useState('')
  const [filterTags, setFilterTags] = useState<TagItem[]>([])

  const typeOptions = [
    { value: '', label: t('filters.anyType') as string },
    { value: 'duo', label: t('filters.duo') as string },
    { value: 'multiplayer', label: t('filters.multiplayer') as string },
  ]
  const fandomOptions = [
    { value: '', label: t('filters.fandomAndOriginal') as string },
    { value: 'fandom', label: t('filters.fandom') as string },
    { value: 'original', label: t('filters.original') as string },
  ]
  const pairingOptions = [
    { value: '', label: t('filters.anyPairing') as string },
    { value: 'sl', label: 'M/M' },
    { value: 'fm', label: 'F/F' },
    { value: 'gt', label: 'M/F' },
    { value: 'any', label: t('filters.anyPairing') as string },
    { value: 'multi', label: t('filters.multi') as string },
    { value: 'other', label: t('filters.other') as string },
  ]
  const contentOptions = [
    { value: '', label: t('filters.anyNsfw') as string },
    { value: 'none', label: t('filters.noNsfw') as string },
    { value: 'rare', label: t('filters.nsfwRare') as string },
    { value: 'often', label: t('filters.nsfwOften') as string },
    { value: 'core', label: t('filters.nsfwCore') as string },
    { value: 'flexible', label: t('filters.nsfwFlexible') as string },
  ]

  const tagsString = filterTags.map(t => t.name).join(',')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (type) params.set('type', type)
    if (fandomType) params.set('fandom_type', fandomType)
    if (pairing) params.set('pairing', pairing)
    if (content) params.set('content', content)
    if (tagsString) params.set('tags', tagsString)
    params.set('page', String(page))
    try {
      const res = await fetch(`/api/public-games?${params}`)
      if (res.ok) {
        const data = await res.json()
        setGames(data.games)
        setTotalPages(data.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }, [q, type, fandomType, pairing, content, tagsString, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [q, type, fandomType, pairing, content, tagsString])

  const paginationItems = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('dots')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="max-w-[1050px] mx-auto px-7 py-12">
      <p className="section-label mb-2">{t('library.sectionLabel') as string}</p>
      <h1 className="page-title mb-10">{t('library.title') as string}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={t('library.searchPlaceholder') as string}
          className="filter-input min-w-[200px] flex-1"
        />
        <FilterSelect value={type} onChange={setType} options={typeOptions} />
        <FilterSelect value={fandomType} onChange={setFandomType} options={fandomOptions} />
        <FilterSelect value={pairing} onChange={setPairing} options={pairingOptions} />
        <FilterSelect value={content} onChange={setContent} options={contentOptions} />
      </div>
      {/* Tag filter */}
      <div className="mb-8">
        <TagAutocomplete
          selectedTags={filterTags}
          onTagsChange={setFilterTags}
          placeholder={t('filters.tagPlaceholder') as string}
        />
      </div>

      {/* Games grid */}
      {loading ? (
        <p className="text-ink-2 font-heading italic">{t('library.loading') as string}</p>
      ) : games.length === 0 ? (
        <p className="text-ink-2 font-heading italic">{t('library.empty') as string}</p>
      ) : (
        <div className="grid gap-[var(--game-gap,1rem)]">
          {games.map(g => (
            <article key={g.id} className="card p-7">
              {/* Title */}
              <Link href={`/library/${g.id}`}>
                <h3 className="font-heading text-[1.2rem] font-normal text-ink leading-tight break-words mb-3">
                  {g.request_title ?? t('nav.untitled') as string}
                </h3>
              </Link>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {g.request_type && (
                  <span className="badge badge-type">
                    {g.request_type === 'duo' ? t('filters.duo') as string : t('filters.multiplayer') as string}
                  </span>
                )}
                {g.request_fandom_type && (
                  <span className="badge badge-fandom">
                    {g.request_fandom_type === 'fandom' ? t('filters.fandom') as string : t('filters.original') as string}
                  </span>
                )}
                {g.request_pairing && g.request_pairing !== 'any' && (
                  <span className="badge badge-fandom">
                    {g.request_pairing === 'sl' ? 'M/M' : g.request_pairing === 'fm' ? 'F/F' : g.request_pairing === 'gt' ? 'M/F' : g.request_pairing}
                  </span>
                )}
                {g.request_content_level && (
                  <span className="badge badge-content">
                    {contentOptions.find(o => o.value === g.request_content_level)?.label ?? g.request_content_level}
                  </span>
                )}
                {(g.request_tags ?? []).map(tag => (
                  <span key={tag} className="badge badge-tag">#{tag.toLowerCase()}</span>
                ))}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="meta-text">
                  {g.participants.map(p => p.nickname).join(', ')}
                  &nbsp;·&nbsp;
                  {g.ic_count} {t('library.messages') as string}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-5">
                <Link href={`/library/${g.id}`} className="link-accent no-underline">
                  {t('library.readGame') as string}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-8">
          <button
            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === 1}
            className="btn-ghost text-[0.65rem] tracking-[0.1em] p-[0.35rem_0.8rem] disabled:opacity-30"
          >
            {t('feed.prev') as string}
          </button>
          {paginationItems.map((item, i) =>
            item === 'dots' ? (
              <span key={`dots-${i}`} className="text-ink-2 text-[0.7rem] px-1">...</span>
            ) : (
              <button
                key={item}
                onClick={() => { setPage(item); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className={`font-mono text-[0.7rem] tracking-[0.08em] border-none cursor-pointer p-[0.35rem_0.6rem]
                  ${item === page ? 'bg-accent text-white' : 'bg-transparent text-ink-2 hover:text-ink'}`}
              >
                {item}
              </button>
            )
          )}
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
