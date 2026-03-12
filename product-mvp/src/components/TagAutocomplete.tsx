'use client'

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { useT } from './SettingsContext'

export interface TagItem {
  id?: number
  slug: string
  name?: string
  category?: string
  approved?: boolean
  usage_count?: number
  matched_alias?: string | null
  parent_tag_id?: number | null
}

interface Props {
  selectedTags: TagItem[]
  onTagsChange: (tags: TagItem[]) => void
  maxTags?: number
  placeholder?: string
  allowCreate?: boolean
  className?: string
  chipsOutside?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  fandom: 'var(--accent)',
  genre: '#6a9fb5',
  trope: '#b58900',
  setting: '#859900',
  character_type: '#d33682',
  pairing: '#e040a0',
  mood: '#cb4b16',
  format: '#2aa198',
  other: 'var(--text-2)',
}

export default function TagAutocomplete({
  selectedTags,
  onTagsChange,
  maxTags = 20,
  placeholder,
  allowCreate = true,
  className = '',
  chipsOutside = false,
}: Props) {
  const t = useT()
  const categoryLabels = t('tags.categories') as unknown as Record<string, string>

  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<TagItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [pendingTagSlug, setPendingTagSlug] = useState<string | null>(null)
  const [pendingCategory, setPendingCategory] = useState<string | null>(null)
  const [fandomSuggestions, setFandomSuggestions] = useState<TagItem[]>([])
  const [fandomSearch, setFandomSearch] = useState('')
  const [activeFandomIndex, setActiveFandomIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const skipCloseRef = useRef(false)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    try {
      const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}&limit=15`, {
        signal: ctrl.signal,
      })
      if (!res.ok) return
      const data: TagItem[] = await res.json()
      const selectedIds = new Set(selectedTags.map(t => t.id))
      const selectedSlugs = new Set(selectedTags.map(t => t.slug))
      const filtered = data.filter(
        t => !selectedIds.has(t.id) && !selectedSlugs.has(t.slug)
      )
      setSuggestions(filtered)
      setShowDropdown(true)
      setActiveIndex(-1)
    } catch {
      // abort is ok
    } finally {
      setLoading(false)
    }
  }, [selectedTags])

  const handleInputChange = (val: string) => {
    setInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val.trim())
    }, 250)
  }

  const addTag = (tag: TagItem) => {
    if (selectedTags.length >= maxTags) return
    if (selectedTags.some(t => t.slug === tag.slug)) return
    onTagsChange([...selectedTags, tag])
    setInput('')
    setSuggestions([])
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const removeTag = (slug: string) => {
    onTagsChange(selectedTags.filter(t => t.slug !== slug))
  }

  const startCreateTag = (slug: string) => {
    if (!allowCreate) return
    if (slug.length > 50) return
    setPendingTagSlug(slug)
    setShowDropdown(true)
  }

  const FANDOM_LINKED_CATEGORIES = ['pairing', 'character_type']

  const selectCategory = async (category: string) => {
    if (FANDOM_LINKED_CATEGORIES.includes(category)) {
      setPendingCategory(category)
      setFandomSearch('')
      try {
        const res = await fetch('/api/tags?category=fandom&limit=20')
        if (res.ok) setFandomSuggestions(await res.json())
      } catch { /* ok */ }
      return
    }
    createTag(pendingTagSlug!, category, null)
  }

  const searchFandoms = async (q: string) => {
    setFandomSearch(q)
    setActiveFandomIndex(0)
    if (q.trim().length < 2) {
      try {
        const res = await fetch('/api/tags?category=fandom&limit=20')
        if (res.ok) setFandomSuggestions(await res.json())
      } catch { /* ok */ }
      return
    }
    try {
      const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}&category=fandom&limit=15`)
      if (res.ok) setFandomSuggestions(await res.json())
    } catch { /* ok */ }
  }

  const createTag = async (slug: string, category: string, parentTagId: number | null) => {
    if (!allowCreate) return
    let tag: TagItem = { slug, name: slug, category }
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, category, parent_tag_id: parentTagId }),
      })
      if (res.ok) {
        tag = await res.json()
      }
    } catch { /* network error — use fallback tag */ }
    setPendingTagSlug(null)
    setPendingCategory(null)
    setFandomSuggestions([])
    addTag(tag)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        addTag(suggestions[activeIndex])
      } else if (input.trim().length >= 2 && allowCreate) {
        startCreateTag(input.trim().toLowerCase())
      }
    } else if (e.key === 'Escape') {
      if (pendingCategory) {
        setPendingCategory(null)
        setFandomSuggestions([])
      } else if (pendingTagSlug) {
        setPendingTagSlug(null)
      } else {
        setShowDropdown(false)
      }
      setActiveIndex(-1)
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (skipCloseRef.current) {
        skipCloseRef.current = false
        return
      }
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
        setPendingTagSlug(null)
        setPendingCategory(null)
        setFandomSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[activeIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  return (
    <div className={`${className}`}>
      {/* Input */}
      <div className="relative">
        {selectedTags.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (input.trim().length >= 2) fetchSuggestions(input.trim())
            }}
            placeholder={placeholder || t('tags.defaultPlaceholder') as string}
            maxLength={50}
            className="filter-input w-full"
          />
        )}

      {/* Dropdown */}
      {showDropdown && (suggestions.length > 0 || pendingTagSlug) && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 z-50 mt-1 max-h-[280px] overflow-y-auto border rounded"
          style={{
            background: 'var(--bg-2)',
            borderColor: 'var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          {suggestions.map((tag, i) => (
            <button
              key={tag.id || tag.slug}
              type="button"
              className="w-full text-left px-3 py-[0.4rem] flex items-center gap-2 cursor-pointer transition-colors"
              style={{
                background: i === activeIndex ? 'var(--accent-dim)' : 'transparent',
                color: 'var(--text)',
                borderBottom: '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
              }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={e => {
                e.preventDefault()
                addTag(tag)
              }}
            >
              <span
                className="font-mono text-[0.75rem] flex-1"
                style={{ letterSpacing: '0.03em' }}
              >
                {tag.name || tag.slug}
              </span>
              <span
                className="text-[0.6rem] font-mono uppercase tracking-wider opacity-60"
                style={{ color: CATEGORY_COLORS[tag.category || 'other'] }}
              >
                {categoryLabels[tag.category || 'other']}
              </span>
            </button>
          ))}
          {allowCreate && !pendingTagSlug && input.trim().length >= 2 &&
            !suggestions.some(s => s.slug === input.trim().toLowerCase() || s.name?.toLowerCase() === input.trim().toLowerCase()) && (
            <button
              type="button"
              className="w-full text-left px-3 py-[0.4rem] font-mono text-[0.75rem] cursor-pointer transition-colors"
              style={{
                color: 'var(--accent)',
                borderTop: suggestions.length > 0 ? '1px solid var(--border)' : 'none',
                background: 'transparent',
              }}
              onMouseDown={e => {
                e.preventDefault()
                skipCloseRef.current = true
                startCreateTag(input.trim().toLowerCase())
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.background = 'var(--accent-dim)'
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.background = 'transparent'
              }}
            >
              {t('tags.create') as string} &laquo;{input.trim()}&raquo;
            </button>
          )}
          {pendingTagSlug && !pendingCategory && (
            <div
              style={{
                borderTop: suggestions.length > 0 ? '1px solid var(--border)' : 'none',
                padding: '0.5rem 0.6rem',
              }}
            >
              <div className="font-mono text-[0.65rem] opacity-60 mb-1.5" style={{ letterSpacing: '0.05em' }}>
                {t('tags.categoryFor') as string} &laquo;{pendingTagSlug}&raquo;:
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="font-mono text-[0.65rem] tracking-wider px-2 py-1 rounded cursor-pointer border transition-colors"
                    style={{
                      color: CATEGORY_COLORS[key],
                      borderColor: CATEGORY_COLORS[key],
                      background: 'transparent',
                    }}
                    onMouseDown={e => {
                      e.preventDefault()
                      skipCloseRef.current = true
                      selectCategory(key)
                    }}
                    onMouseEnter={e => {
                      (e.target as HTMLElement).style.background = CATEGORY_COLORS[key]
                      ;(e.target as HTMLElement).style.color = '#fff'
                    }}
                    onMouseLeave={e => {
                      (e.target as HTMLElement).style.background = 'transparent'
                      ;(e.target as HTMLElement).style.color = CATEGORY_COLORS[key]
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {pendingTagSlug && pendingCategory && FANDOM_LINKED_CATEGORIES.includes(pendingCategory) && (
            <div
              style={{
                borderTop: '1px solid var(--border)',
                padding: '0.5rem 0.6rem',
              }}
            >
              <div className="font-mono text-[0.65rem] opacity-60 mb-1.5" style={{ letterSpacing: '0.05em' }}>
                {t('tags.fandomFor') as string} &laquo;{pendingTagSlug}&raquo;:
              </div>
              <input
                type="text"
                value={fandomSearch}
                onChange={e => searchFandoms(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (fandomSuggestions.length > 0) {
                      const idx = Math.min(activeFandomIndex, fandomSuggestions.length - 1)
                      createTag(pendingTagSlug!, pendingCategory!, fandomSuggestions[idx].id!)
                    } else {
                      createTag(pendingTagSlug!, pendingCategory!, null)
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActiveFandomIndex(prev => Math.min(prev + 1, fandomSuggestions.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActiveFandomIndex(prev => Math.max(prev - 1, 0))
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    setPendingCategory(null)
                    setFandomSuggestions([])
                  }
                }}
                placeholder={t('tags.searchFandom') as string}
                className="filter-input w-full mb-1.5"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                autoFocus
                onMouseDown={() => { skipCloseRef.current = true }}
              />
              <div className="flex flex-col max-h-[150px] overflow-y-auto">
                {fandomSuggestions.map((f, i) => (
                  <button
                    key={f.id}
                    type="button"
                    className="text-left px-2 py-1 font-mono text-[0.7rem] cursor-pointer transition-colors rounded"
                    style={{
                      color: 'var(--text)',
                      background: i === activeFandomIndex ? 'var(--accent-dim)' : 'transparent',
                    }}
                    onMouseDown={e => {
                      e.preventDefault()
                      skipCloseRef.current = true
                      createTag(pendingTagSlug!, pendingCategory!, f.id!)
                    }}
                    onMouseEnter={() => setActiveFandomIndex(i)}
                  >
                    {f.name || f.slug}
                  </button>
                ))}
                {fandomSuggestions.length === 0 && (
                  <div className="text-[0.65rem] opacity-40 font-mono py-1 px-2">{t('tags.noResults') as string}</div>
                )}
              </div>
              <button
                type="button"
                className="mt-1 font-mono text-[0.6rem] opacity-50 hover:opacity-80 cursor-pointer"
                onMouseDown={e => {
                  e.preventDefault()
                  skipCloseRef.current = true
                  createTag(pendingTagSlug, pendingCategory, null)
                }}
              >
                {t('tags.withoutFandom') as string}
              </button>
            </div>
          )}
          {loading && (
            <div className="px-3 py-2 text-[0.7rem] opacity-50 font-mono text-center">
              ...
            </div>
          )}
        </div>
      )}
      </div>

      {/* Selected tags as chips below input */}
      {selectedTags.length > 0 && !chipsOutside && (
        <div className="flex flex-wrap gap-[0.4rem] mt-[0.4rem]">
          {selectedTags.map(tag => (
            <span
              key={tag.slug}
              className="tag-chip flex items-center gap-1"
              style={{
                borderLeft: `2px solid ${CATEGORY_COLORS[tag.category || 'other'] || 'var(--text-2)'}`,
              }}
            >
              {tag.name || tag.slug}
              <button
                type="button"
                onClick={() => removeTag(tag.slug)}
                className="ml-0.5 opacity-50 hover:opacity-100 cursor-pointer"
                style={{ fontSize: '0.8rem', lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
