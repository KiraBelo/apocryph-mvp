'use client'
import { useT } from '../SettingsContext'
import { htmlToText } from '@/lib/game-utils'
import type { SearchResult, NoteEntry } from './types'

interface SearchPanelProps {
  searchQuery: string
  searchScope: 'ic' | 'ooc' | 'notes'
  searchLoading: boolean
  serverSearchResults: SearchResult[]
  noteSearchResults: NoteEntry[]
  onQueryChange: (v: string) => void
  onScopeChange: (v: 'ic' | 'ooc' | 'notes') => void
  onResultClick: (result: SearchResult) => void
  onNoteClick: (noteId: number) => void
  onClose: () => void
}

export default function SearchPanel({
  searchQuery, searchScope, searchLoading,
  serverSearchResults, noteSearchResults,
  onQueryChange, onScopeChange, onResultClick, onNoteClick, onClose,
}: SearchPanelProps) {
  const searchLower = searchQuery.toLowerCase().trim()
  const t = useT()

  return (
    <>
      {/* Search bar */}
      <div className="px-4 py-2 border-b border-edge bg-surface-2 flex gap-2 items-center shrink-0">
        <input
          autoFocus
          value={searchQuery}
          onChange={e => onQueryChange(e.target.value)}
          placeholder={t('game.searchPlaceholder') as string}
          className="flex-1 font-mono text-[0.8rem] bg-surface border border-edge text-ink p-[0.3rem_0.55rem] outline-none"
        />
        <div className="flex gap-1">
          {(['ic', 'ooc', 'notes'] as const).map(s => (
            <button key={s} onClick={() => onScopeChange(s)} className={`font-mono text-[0.55rem] tracking-[0.08em] uppercase p-[0.2rem_0.4rem] cursor-pointer ${searchScope === s ? 'bg-surface-3 border border-edge text-ink' : 'bg-transparent border border-transparent text-ink-2'}`}>
              {s === 'ic' ? 'IC' : s === 'ooc' ? 'OOC' : 'Notes'}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.9rem]">✕</button>
      </div>

      {/* Search results */}
      {searchQuery && (
        <div className="max-h-60 overflow-y-auto bg-surface-2 border-b border-edge shrink-0">
          {searchScope === 'notes' ? (
            noteSearchResults.length === 0 ? (
              <p className="px-6 py-3 font-mono text-[0.75rem] text-edge">{t('game.notFound') as string}</p>
            ) : (
              noteSearchResults.map(note => {
                const plain = htmlToText(note.content)
                const idx = plain.toLowerCase().indexOf(searchLower)
                const snippet = idx >= 0 ? '...' + plain.slice(Math.max(0, idx - 30), idx + 60) + '...' : plain.slice(0, 80)
                const date = new Date(note.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={note.id} className="px-6 py-[0.65rem] border-b border-edge cursor-pointer hover:bg-surface-3 transition-colors"
                    onClick={() => onNoteClick(note.id)}>
                    <span className="font-mono text-[0.58rem] text-ink-2 mr-2">{date}</span>
                    <span className="font-mono text-[0.78rem] text-ink">{snippet}</span>
                  </div>
                )
              })
            )
          ) : searchLoading ? (
            <p className="px-6 py-3 font-mono text-[0.75rem] text-ink-2">{t('game.searching') as string}</p>
          ) : serverSearchResults.length === 0 ? (
            <p className="px-6 py-3 font-mono text-[0.75rem] text-edge">{t('game.notFound') as string}</p>
          ) : (
            serverSearchResults.map(r => (
              <div key={r.id} className="px-6 py-[0.65rem] border-b border-edge cursor-pointer hover:bg-surface-3 transition-colors"
                onClick={() => onResultClick(r)}>
                <span className="font-mono text-[0.58rem] text-ink-2 mr-2">{r.nickname}</span>
                <span className="font-mono text-[0.55rem] text-edge mr-2">{t('game.page') as string} {r.page}</span>
                <span className="font-mono text-[0.78rem] text-ink">{r.snippet}</span>
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}
