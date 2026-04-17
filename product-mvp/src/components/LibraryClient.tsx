'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useT, usePlural } from './SettingsContext'
import TagAutocomplete, { type TagItem } from './TagAutocomplete'
import { ChevronRight, Heart } from 'lucide-react'
import SharedFilterSelect from './FilterSelect'

function FilterSelect(props: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <SharedFilterSelect {...props} variant="filter" />
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
  request_language: string | null
  request_tags: string[] | null
  ic_count: string
  likes_count: string
  participants: { nickname: string; avatar_url: string | null }[]
}

export default function LibraryClient() {
  const t = useT()
  const tPlural = usePlural()
  const [games, setGames] = useState<PublicGame[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [fandomType, setFandomType] = useState('')
  const [pairing, setPairing] = useState('')
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('')
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
    { value: 'multi', label: t('filters.multi') as string },
    { value: 'other', label: t('filters.other') as string },
    { value: 'any', label: t('filters.notImportant') as string },
  ]
  const contentOptions = [
    { value: '', label: t('filters.anyNsfw') as string },
    { value: 'none', label: t('filters.noNsfw') as string },
    { value: 'rare', label: t('filters.nsfwRare') as string },
    { value: 'often', label: t('filters.nsfwOften') as string },
    { value: 'core', label: t('filters.nsfwCore') as string },
    { value: 'flexible', label: t('filters.nsfwFlexible') as string },
  ]
  const languageOptions = [
    { value: '', label: t('filters.anyLanguage') as string },
    { value: 'ru', label: t('filters.langRu') as string },
    { value: 'en', label: t('filters.langEn') as string },
  ]

  const tagsString = filterTags.map(t => t.slug).join(',')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (type) params.set('type', type)
    if (fandomType) params.set('fandom_type', fandomType)
    if (pairing) params.set('pairing', pairing)
    if (content) params.set('content', content)
    if (language) params.set('language', language)
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
  }, [q, type, fandomType, pairing, content, language, tagsString, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [q, type, fandomType, pairing, content, language, tagsString])

  const paginationItems = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('dots')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="max-w-[1050px] mx-auto px-7 py-8">
      <h1 className="page-title mb-6">{t('library.title') as string}</h1>

      {/* Filters */}
      <div className={`flex flex-wrap gap-3 p-[0.75rem_1rem] bg-surface-2 border border-edge ${filterTags.length > 0 ? '' : 'mb-5'}`}>
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={t('library.searchPlaceholder') as string}
          className="filter-input flex-[1_1_200px]"
        />
        <FilterSelect value={type} onChange={setType} options={typeOptions} />
        <FilterSelect value={fandomType} onChange={setFandomType} options={fandomOptions} />
        <FilterSelect value={pairing} onChange={setPairing} options={pairingOptions} />
        <FilterSelect value={content} onChange={setContent} options={contentOptions} />
        <FilterSelect value={language} onChange={setLanguage} options={languageOptions} />
        <TagAutocomplete
          selectedTags={filterTags}
          onTagsChange={setFilterTags}
          maxTags={10}
          allowCreate={false}
          placeholder={t('filters.tagPlaceholder') as string}
          className="flex-[1_1_250px] min-w-0"
          chipsOutside
        />
      </div>
      {/* Tag chips — full width */}
      {filterTags.length > 0 && (
        <div className="flex flex-wrap gap-[0.4rem] px-[1rem] pb-[0.6rem] -mt-1 bg-surface-2 border-x border-b border-edge mb-5">
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

      {/* Games grid */}
      {loading ? (
        <div className="grid gap-[var(--game-gap,1rem)]">
          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ animation: `fadeInUp 0.3s ease ${i * 0.1}s both` }}>
              <div className="skeleton-block" style={{ width: '70%', height: '0.6rem' }} />
              <div className="skeleton-block" style={{ width: '55%', height: '1.15rem' }} />
              <div className="flex gap-2">
                {[40, 55, 45].map((w, j) => (
                  <div key={j} className="skeleton-block" style={{ width: `${w}px`, height: '0.9rem' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <p className="text-ink-2 font-heading italic">{t('library.empty') as string}</p>
      ) : (
        <div className="grid gap-[var(--game-gap,1rem)]">
          {games.map(g => {
            const metaParts = [
              g.request_type && (g.request_type === 'duo' ? t('filters.duo') as string : t('filters.multiplayer') as string),
              g.request_fandom_type && (g.request_fandom_type === 'fandom' ? t('filters.fandom') as string : t('filters.original') as string),
              g.request_pairing && g.request_pairing !== 'any' && (
                g.request_pairing === 'sl' ? 'M/M' : g.request_pairing === 'fm' ? 'F/F' : g.request_pairing === 'gt' ? 'M/F' : g.request_pairing
              ),
              g.request_content_level && (contentOptions.find(o => o.value === g.request_content_level)?.label ?? g.request_content_level),
              g.request_language && (languageOptions.find(o => o.value === g.request_language)?.label ?? g.request_language),
            ].filter(Boolean) as string[]
            const tags = g.request_tags ?? []

            return (
              <article key={g.id} className="card">
                {/* Header: meta + likes */}
                <div className="card-header">
                  <div className="card-meta">
                    {metaParts.map((label, i) => (
                      <span key={i}>
                        {i > 0 && <span className="sep">/</span>}
                        {label}
                      </span>
                    ))}
                    <span className="sep">·</span>
                    <span>{g.participants.map(p => p.nickname).join(', ')}</span>
                    <span className="sep">·</span>
                    <span>{tPlural(parseInt(g.ic_count) || 0, 'library.messages')}</span>
                  </div>
                  <div className="card-actions">
                    <span className="inline-flex items-center gap-[0.3rem]">
                      <Heart size={18} strokeWidth={1.5} fill={parseInt(g.likes_count) > 0 ? 'currentColor' : 'none'} aria-hidden="true" />
                      {parseInt(g.likes_count) > 0 && g.likes_count}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <Link href={`/library/${g.id}`} className="card-title text-[1.3rem]">
                  {g.request_title ?? t('nav.untitled') as string}
                </Link>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="card-tags">
                    {tags.map(tag => (
                      <span key={tag} className="tag tag-user">{tag.toLowerCase()}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="card-footer">
                  <div />
                  <Link href={`/library/${g.id}`} className="respond-pill">
                    {t('library.readGame') as string}
                    <ChevronRight size={11} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            )
          })}
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
