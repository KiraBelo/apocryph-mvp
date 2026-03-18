import { useState } from 'react'
import { escapeHtml } from '@/lib/game-utils'
import type { NoteEntry, Message } from '../game/types'

export function useGameNotes({ gameId, t }: {
  gameId: string
  t: (key: string) => unknown
}) {
  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteEditingId, setNoteEditingId] = useState<number | null>(null)
  const [noteEditTitle, setNoteEditTitle] = useState('')
  const [noteEditContent, setNoteEditContent] = useState('')
  const [noteEditSaving, setNoteEditSaving] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set())
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteKey, setNewNoteKey] = useState(0)
  const [newNoteSending, setNewNoteSending] = useState(false)
  const [quoteToast, setQuoteToast] = useState(false)

  function loadNotes() {
    if (notesLoaded) return
    setNotesLoading(true)
    fetch(`/api/games/${gameId}/notes`)
      .then(r => r.json())
      .then(d => {
        setNotes(d.notes ?? [])
        setNotesLoaded(true)
      })
      .catch(() => { /* network error */ })
      .finally(() => setNotesLoading(false))
  }

  async function submitNote() {
    if (!newNoteContent.trim() || newNoteContent === '<p></p>' || newNoteSending) return
    setNewNoteSending(true)
    try {
      const res = await fetch(`/api/games/${gameId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newNoteTitle, content: newNoteContent }),
      })
      if (!res.ok) { alert(t('errors.savingNote') as string); return }
      const d = await res.json()
      if (d.note) setNotes(prev => [d.note, ...prev])
      setNewNoteTitle('')
      setNewNoteContent('')
      setNewNoteKey(k => k + 1)
    } catch { alert(t('errors.networkError') as string) }
    finally { setNewNoteSending(false) }
  }

  async function saveNoteEdit(noteId: number) {
    if (noteEditSaving) return
    setNoteEditSaving(true)
    try {
      const res = await fetch(`/api/games/${gameId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: noteEditTitle, content: noteEditContent }),
      })
      if (!res.ok) { alert(t('errors.savingNote') as string); return }
      const d = await res.json()
      if (d.note) setNotes(prev => prev.map(n => n.id === noteId ? d.note : n))
      setNoteEditingId(null)
    } catch { alert(t('errors.networkError') as string) }
    finally { setNoteEditSaving(false) }
  }

  async function deleteNote(noteId: number) {
    try {
      const res = await fetch(`/api/games/${gameId}/notes/${noteId}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(t(`errors.${d.error}`) as string || t('errors.networkError') as string); return }
      setNotes(prev => prev.filter(n => n.id !== noteId))
      setDeleteConfirmId(null)
    } catch { alert(t('errors.networkError') as string) }
  }

  function toggleNoteExpand(id: number) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function quotePost(msg: Message, setActiveTab: (tab: 'notes') => void) {
    const selection = window.getSelection()
    let text = ''
    if (selection && selection.toString().trim()) {
      text = selection.toString().trim()
    } else {
      const div = document.createElement('div')
      div.innerHTML = msg.content
      text = (div.textContent ?? div.innerText ?? '').trim()
    }
    const date = new Date(msg.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    const quoteHtml = `<blockquote><p>${escapeHtml(text)}</p><p><em>— ${escapeHtml(msg.nickname)}, ${date}</em></p></blockquote><p></p>`
    setNewNoteContent(quoteHtml)
    setNewNoteKey(k => k + 1)
    setActiveTab('notes')
    setQuoteToast(true)
    setTimeout(() => setQuoteToast(false), 2000)
  }

  function startNoteEdit(note: NoteEntry) {
    setNoteEditingId(note.id)
    setNoteEditTitle(note.title)
    setNoteEditContent(note.content)
  }

  return {
    notes, notesLoaded, notesLoading, loadNotes,
    noteEditingId, setNoteEditingId,
    noteEditTitle, setNoteEditTitle,
    noteEditContent, setNoteEditContent,
    noteEditSaving,
    expandedNotes, deleteConfirmId, setDeleteConfirmId,
    newNoteTitle, setNewNoteTitle,
    newNoteContent, setNewNoteContent,
    newNoteKey, newNoteSending,
    quoteToast,
    submitNote, saveNoteEdit, deleteNote, toggleNoteExpand,
    quotePost, startNoteEdit,
  }
}
