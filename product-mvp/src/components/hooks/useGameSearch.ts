import { useState, useRef, useEffect } from 'react'
import { htmlToText } from '@/lib/game-utils'
import type { Message, NoteEntry, SearchResult } from '../game/types'

export function useGameSearch({ gameId, icMessages, oocMessages, notes }: {
  gameId: string
  icMessages: Message[]
  oocMessages: Message[]
  notes: NoteEntry[]
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchScope, setSearchScope] = useState<'ic' | 'ooc' | 'notes'>('ic')
  const [serverSearchResults, setServerSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Server-side search with debounce + AbortController.
  // Эффект управляет асинхронным процессом (fetch) — setState здесь
  // сбрасывает устаревшие результаты при смене scope/закрытии поиска.
  // Перенести setState в обработчик события нельзя: тут реагируем на
  // изменение searchQuery/searchScope, не на клик.
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!searchOpen || searchScope === 'notes') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset stale fetch state when search closed or scope=notes
      setServerSearchResults([])
      setSearchLoading(false)
      return
    }
    const q = searchQuery.trim()
    if (q.length < 2) {
      setServerSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    const abort = new AbortController()
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/messages?type=${searchScope}&search=${encodeURIComponent(q)}`, { signal: abort.signal })
        const data = await res.json()
        setServerSearchResults(data.results ?? [])
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setServerSearchResults([])
      }
      setSearchLoading(false)
    }, 300)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); abort.abort() }
  }, [searchQuery, searchScope, searchOpen, gameId])

  const searchLower = searchQuery.toLowerCase().trim()
  const noteSearchResults = searchLower && searchScope === 'notes'
    ? notes.filter(n => htmlToText(n.content).toLowerCase().includes(searchLower))
    : []

  return {
    searchOpen, setSearchOpen,
    searchQuery, setSearchQuery,
    searchScope, setSearchScope,
    serverSearchResults, searchLoading,
    noteSearchResults, searchLower,
  }
}
