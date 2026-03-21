'use client'
import { useT } from '../SettingsContext'
import RichEditor from '../RichEditor'
import { htmlToText, NOTE_COLLAPSE_CHARS } from '@/lib/game-utils'
import type { NoteEntry } from './types'

interface NotesTabProps {
  notes: NoteEntry[]
  notesLoading: boolean
  isLeft: boolean
  isFrozen: boolean
  fullscreen: boolean
  editorCollapsed: boolean
  setEditorCollapsed: (v: boolean) => void
  // Note editing
  noteEditingId: number | null
  setNoteEditingId: (v: number | null) => void
  noteEditTitle: string
  setNoteEditTitle: (v: string) => void
  noteEditContent: string
  setNoteEditContent: (v: string) => void
  noteEditSaving: boolean
  expandedNotes: Set<number>
  deleteConfirmId: number | null
  setDeleteConfirmId: (v: number | null) => void
  // New note
  newNoteTitle: string
  setNewNoteTitle: (v: string) => void
  newNoteContent: string
  setNewNoteContent: (v: string) => void
  newNoteKey: number
  newNoteSending: boolean
  // Actions
  onStartNoteEdit: (note: NoteEntry) => void
  onSaveNoteEdit: (noteId: number) => void
  onDeleteNote: (noteId: number) => void
  onToggleExpand: (id: number) => void
  onSubmitNote: () => void
}

export default function NotesTab({
  notes, notesLoading, isLeft, isFrozen, fullscreen,
  editorCollapsed, setEditorCollapsed,
  noteEditingId, setNoteEditingId,
  noteEditTitle, setNoteEditTitle,
  noteEditContent, setNoteEditContent,
  noteEditSaving, expandedNotes,
  deleteConfirmId, setDeleteConfirmId,
  newNoteTitle, setNewNoteTitle,
  newNoteContent, setNewNoteContent,
  newNoteKey, newNoteSending,
  onStartNoteEdit, onSaveNoteEdit, onDeleteNote, onToggleExpand, onSubmitNote,
}: NotesTabProps) {
  const t = useT()

  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col" style={{ gap: 'var(--game-gap, 1.5rem)' }}>
        {notesLoading && (
          <div className="flex flex-col" style={{ gap: 'var(--game-gap, 1.5rem)' }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-surface-2 border border-edge" style={{ animation: `fadeInUp 0.3s ease ${i * 0.1}s both` }}>
                <div className="px-3 py-[0.4rem] border-b border-edge bg-surface-3 flex justify-between items-center">
                  <div className="flex flex-col gap-[0.25rem]">
                    <div className="skeleton-block" style={{ width: '120px', height: '0.8rem' }} />
                    <div className="skeleton-block" style={{ width: '80px', height: '0.55rem' }} />
                  </div>
                </div>
                <div className="p-[0.75rem_0.9rem] flex flex-col gap-2">
                  <div className="skeleton-block" style={{ width: '100%', height: '0.8rem' }} />
                  <div className="skeleton-block" style={{ width: '85%', height: '0.8rem' }} />
                  <div className="skeleton-block" style={{ width: '55%', height: '0.8rem' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!notesLoading && notes.length === 0 && (
          <p className="font-heading italic text-ink-2 text-center mt-8 text-[1rem]">{t('game.noNotes') as string}</p>
        )}
        {notes.map(note => {
          const isEditing = noteEditingId === note.id
          const isExpanded = expandedNotes.has(note.id)
          const isDeleteConfirm = deleteConfirmId === note.id
          const plain = htmlToText(note.content)
          const isLong = plain.length > NOTE_COLLAPSE_CHARS
          const wasEdited = note.updated_at && note.updated_at !== note.created_at
          const dateStr = new Date(note.created_at).toLocaleString('ru', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })
          return (
            <div key={note.id} data-note-id={note.id} className="bg-surface-2" style={{ border: `1px solid ${isEditing ? 'var(--accent-2)' : 'var(--border)'}` }}>
              <div className="px-3 py-[0.4rem] border-b border-edge flex justify-between items-center bg-surface-3">
                <div className="flex flex-col gap-[0.1rem] min-w-0">
                  {note.title && (
                    <span className="font-heading italic text-[0.82rem] text-ink overflow-hidden text-ellipsis whitespace-nowrap">{note.title}</span>
                  )}
                  <span className="font-mono text-[0.58rem] text-ink-2 tracking-[0.06em]">
                    {dateStr}
                    {wasEdited && <span className="ml-[0.5em] opacity-55">· {t('game.edited') as string}</span>}
                  </span>
                </div>
                {!isEditing && !isDeleteConfirm && (
                  <div className="flex gap-[0.1rem]">
                    <button onClick={() => onStartNoteEdit(note)} title={t('game.editNote') as string} className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.78rem] p-[0.1rem_0.25rem] leading-none">✎</button>
                    <button onClick={() => setDeleteConfirmId(note.id)} title={t('game.deleteNote') as string} className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.78rem] p-[0.1rem_0.25rem] leading-none">✕</button>
                  </div>
                )}
                {isDeleteConfirm && (
                  <div className="flex gap-[0.4rem] items-center">
                    <span className="font-mono text-[0.6rem] text-ink-2">{t('game.deleteConfirm') as string}</span>
                    <button onClick={() => onDeleteNote(note.id)} className="bg-[#c0392b] text-white border-none font-mono text-[0.6rem] p-[0.2rem_0.5rem] cursor-pointer">{t('myRequests.yes') as string}</button>
                    <button onClick={() => setDeleteConfirmId(null)} className="bg-transparent border border-edge text-ink-2 font-mono text-[0.6rem] p-[0.2rem_0.5rem] cursor-pointer">{t('myRequests.no') as string}</button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div>
                  <input type="text" value={noteEditTitle} onChange={e => setNoteEditTitle(e.target.value)} placeholder={t('game.noteTitlePlaceholder') as string} className="block w-full box-border px-3 py-2 border-none border-b border-edge bg-surface-2 text-ink font-heading italic text-[0.9rem] outline-none" />
                  <RichEditor content={noteEditContent} onChange={setNoteEditContent} minHeight="100px" />
                  <div className="flex gap-2 justify-end px-3 py-[0.4rem] border-t border-edge">
                    <button onClick={() => setNoteEditingId(null)} className="btn-ghost text-[0.7rem] p-[0.3rem_0.7rem]">{t('game.cancel') as string}</button>
                    <button onClick={() => onSaveNoteEdit(note.id)} disabled={noteEditSaving} className="bg-accent-2 text-white font-heading italic text-[0.85rem] border-none p-[0.3rem_0.9rem] cursor-pointer">{noteEditSaving ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('game.save') as string}</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="tiptap-content p-[0.75rem_0.9rem] relative" style={{ maxHeight: isLong && !isExpanded ? '8em' : 'none', overflow: isLong && !isExpanded ? 'hidden' : 'visible' }} dangerouslySetInnerHTML={{ __html: note.content }} />
                  {isLong && (
                    <button onClick={() => onToggleExpand(note.id)} className="block w-full text-center font-mono text-[0.6rem] tracking-[0.08em] text-accent-2 bg-transparent border-none border-t border-edge p-[0.35rem] cursor-pointer">
                      {isExpanded ? t('game.noteCollapse') as string : t('game.noteExpand') as string}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Note editor footer */}
      {isLeft && (
        <div className="px-6 py-4 text-center bg-surface-2 border-t border-edge font-heading italic text-ink-2 shrink-0">{t('game.youLeft') as string}</div>
      )}
      {!isLeft && !isFrozen && <div className="border-t border-edge bg-surface-2 shrink-0">
        {editorCollapsed ? (
          <button onClick={() => setEditorCollapsed(false)} className="w-full bg-transparent border-none p-[0.55rem_1.25rem] cursor-pointer flex items-center justify-center text-ink-2 opacity-50" title={t('game.addNote') as string}>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="18" height="12" rx="2"/><line x1="4" y1="5" x2="4" y2="5" strokeWidth="2"/><line x1="7" y1="5" x2="7" y2="5" strokeWidth="2"/><line x1="10" y1="5" x2="10" y2="5" strokeWidth="2"/><line x1="13" y1="5" x2="13" y2="5" strokeWidth="2"/><line x1="16" y1="5" x2="16" y2="5" strokeWidth="2"/><line x1="4" y1="9" x2="4" y2="9" strokeWidth="2"/><line x1="7" y1="9" x2="16" y2="9" strokeWidth="2"/>
            </svg>
          </button>
        ) : (
          <>
            <input key={`title-${newNoteKey}`} type="text" value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} placeholder={t('game.noteTitlePlaceholder') as string} className="block w-full box-border px-3 py-2 border-none border-b border-edge bg-surface-2 text-ink font-heading italic text-[0.9rem] outline-none" />
            <RichEditor key={newNoteKey} content={newNoteContent} onChange={setNewNoteContent} placeholder={t('game.newNotePlaceholder') as string} minHeight="80px" />
            <div className="flex justify-end items-center gap-2 px-3 py-2">
              {fullscreen && (
                <button onClick={() => setEditorCollapsed(true)} title={t('game.collapseEditor') as string} className="bg-transparent border-none text-ink-2 cursor-pointer font-mono text-[0.75rem] p-[0.2rem_0.5rem]">{t('game.collapseEditor') as string}</button>
              )}
              <button onClick={onSubmitNote} disabled={newNoteSending || !newNoteContent.trim() || newNoteContent === '<p></p>'} className="bg-accent-2 text-white font-heading italic text-[0.95rem] border-none p-[0.55rem_1.5rem] cursor-pointer" style={{ opacity: (newNoteSending || !newNoteContent.trim() || newNoteContent === '<p></p>') ? 0.6 : 1 }}>
                {newNoteSending ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('game.addNoteButton') as string}
              </button>
            </div>
          </>
        )}
      </div>}
    </div>
  )
}
