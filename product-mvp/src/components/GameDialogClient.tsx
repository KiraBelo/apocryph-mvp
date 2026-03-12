'use client'
import { useEffect, useRef, useState, memo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import RichEditor from './RichEditor'
import Link from 'next/link'
import { useSettings, useT } from './SettingsContext'

interface Message {
  id: string; participant_id: string; content: string; created_at: string;
  edited_at: string | null; nickname: string; avatar_url: string | null; user_id: string;
  type: string
}

interface Participant {
  id: string; user_id: string; nickname: string; avatar_url: string | null; banner_url: string | null; banner_pref: string; left_at: string | null
}

interface NoteEntry {
  id: number; title: string; content: string; created_at: string; updated_at: string | null
}

interface SearchResult {
  id: string; snippet: string; created_at: string; nickname: string; page: number
}

interface Props {
  gameId: string
  game: { id: string; request_id: string | null; banner_url: string | null; ooc_enabled: boolean; moderation_status?: string }
  initialMessages: Message[]
  initialPage: number
  totalPages: number
  participants: Participant[]
  me: Participant
  userId: string
  requestTitle: string | null
}

// LEAVE_REASONS moved to i18n: game.leaveReasons
const NOTE_COLLAPSE_CHARS = 350

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const MsgContent = memo(function MsgContent({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />
}, (prev, next) => prev.html === next.html && prev.className === next.className)

const FEED_BG_PALETTE = [
  'rgba(190, 175, 160, 0.10)',
  'rgba(160, 175, 190, 0.10)',
  'rgba(165, 185, 160, 0.10)',
  'rgba(185, 160, 175, 0.10)',
  'rgba(175, 160, 185, 0.10)',
  'rgba(185, 180, 155, 0.10)',
]

function feedPostBg(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  return FEED_BG_PALETTE[hash % FEED_BG_PALETTE.length]
}

export default function GameDialogClient({ gameId, game, initialMessages, initialPage, totalPages: initTotalPages, participants, me, userId, requestTitle }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { notesEnabled, gameLayout, set } = useSettings()
  const t = useT()
  // IC pagination
  const [icMessages, setIcMessages] = useState<Message[]>(initialMessages)
  const [icPage, setIcPage] = useState(initialPage)
  const [icTotalPages, setIcTotalPages] = useState(initTotalPages)
  // OOC lazy loading + pagination
  const [oocMessages, setOocMessages] = useState<Message[]>([])
  const [oocPage, setOocPage] = useState(1)
  const [oocTotalPages, setOocTotalPages] = useState(1)
  const [oocLoaded, setOocLoaded] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)
  // Search results from server
  const [serverSearchResults, setServerSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Pending scroll-to after page load
  const [scrollToMsgId, setScrollToMsgId] = useState<string | null>(null)
  const initialTab = searchParams.get('tab') === 'ooc' ? 'ooc' as const : searchParams.get('tab') === 'notes' ? 'notes' as const : 'ic' as const
  const [activeTab, setActiveTab] = useState<'ic' | 'ooc' | 'notes'>(initialTab)
  const [content, setContent] = useState('')
  const [oocContent, setOocContent] = useState('')
  const [sending, setSending] = useState(false)
  const [sendKey, setSendKey] = useState(0)
  const [oocSendKey, setOocSendKey] = useState(0)
  const [showLeave, setShowLeave] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')
  const [reportReason, setReportReason] = useState('')
  const [nickname, setNickname] = useState(me.nickname)
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(me.banner_url ?? '')
  const [bannerPref, setBannerPref] = useState<'own' | 'partner' | 'none'>(me.banner_pref as 'own' | 'partner' | 'none' ?? 'own')
  const [oocEnabled, setOocEnabled] = useState(game.ooc_enabled)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [editorCollapsed, setEditorCollapsed] = useState(false)
  const [editorPinned, setEditorPinned] = useState(false)
  // Search
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchScope, setSearchScope] = useState<'ic' | 'ooc' | 'notes'>('ic')
  // Notes (diary)
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
  const [diceQueue, setDiceQueue] = useState<{ sides: number; result: number; roller: string }[]>([])
  const [showDicePanel, setShowDicePanel] = useState(false)
  const [diceSides, setDiceSides] = useState('20')
  const [diceRolling, setDiceRolling] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLeft = !!me.left_at
  const isFrozen = game.moderation_status && game.moderation_status !== 'visible'

  const scrollRef = useRef<HTMLDivElement>(null)

  // Cleanup scroll timers on unmount
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      if (scrollStopRef.current) clearTimeout(scrollStopRef.current)
    }
  }, [])

  // Escape exits fullscreen
  useEffect(() => {
    if (!fullscreen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setFullscreen(false); setEditorCollapsed(false) } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [fullscreen])

  // Mark IC as read on open
  useEffect(() => {
    fetch(`/api/games/${gameId}/read`, { method: 'POST' })
  }, [gameId])

  // Mark tab as read when switching
  useEffect(() => {
    if (activeTab === 'ooc') {
      fetch(`/api/games/${gameId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: 'ooc' }),
      })
    } else if (activeTab === 'ic') {
      fetch(`/api/games/${gameId}/read`, { method: 'POST' })
    }
  }, [activeTab, gameId])

  // Load notes once when tab is first opened
  useEffect(() => {
    if (activeTab !== 'notes' || !notesEnabled || notesLoaded) return
    setNotesLoading(true)
    fetch(`/api/games/${gameId}/notes`)
      .then(r => r.json())
      .then(d => {
        setNotes(d.notes ?? [])
        setNotesLoaded(true)
      })
      .catch(() => { /* network error */ })
      .finally(() => setNotesLoading(false))
  }, [activeTab, gameId, notesEnabled, notesLoaded])

  // SSE
  useEffect(() => {
    if (isLeft) return
    const es = new EventSource(`/api/games/${gameId}/messages/stream`)
    es.onmessage = e => {
      const data = JSON.parse(e.data)
      if (data._type === 'edit') {
        const updater = (prev: Message[]) => prev.map(m => m.id === data.id ? { ...m, content: data.content, edited_at: data.edited_at } : m)
        setIcMessages(updater)
        setOocMessages(updater)
      } else if (data.type === 'dice') {
        try {
          const parsed = JSON.parse(data.content)
          setDiceQueue(prev => [...prev, { sides: parsed.sides, result: parsed.result, roller: parsed.roller }])
        } catch {}
      } else {
        const { _type: _, ...msg } = data
        if (msg.type === 'ooc') {
          setOocMessages(prev => [...prev, msg as Message])
        } else {
          setIcMessages(prev => [...prev, msg as Message])
        }
      }
    }
    return () => es.close()
  }, [gameId, isLeft])

  // Collapse editor on scroll, re-expand when scrolling stops
  const scrollStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreScrollRef = useRef(false)
  function handleMessagesScroll() {
    if (editingId || editorPinned) return
    // Ignore scroll events triggered by editor collapse/expand layout shift
    if (ignoreScrollRef.current) return
    // Collapse on scroll start
    if (!editorCollapsed) {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => {
        ignoreScrollRef.current = true
        setEditorCollapsed(true)
        // Allow scroll events again after layout settles
        setTimeout(() => { ignoreScrollRef.current = false }, 100)
      }, 150)
    }
    // Re-expand when scrolling stops
    if (scrollStopRef.current) clearTimeout(scrollStopRef.current)
    scrollStopRef.current = setTimeout(() => {
      ignoreScrollRef.current = true
      setEditorCollapsed(false)
      setTimeout(() => { ignoreScrollRef.current = false }, 100)
    }, 2000)
  }

  // Scroll to bottom on new message in current tab
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [icMessages.length, oocMessages.length, activeTab])

  // Submit new note
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

  // Save note edit
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

  // Delete note
  async function deleteNote(noteId: number) {
    await fetch(`/api/games/${gameId}/notes/${noteId}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n.id !== noteId))
    setDeleteConfirmId(null)
  }

  function toggleNoteExpand(id: number) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Quote a post → pre-fill new note editor and switch to notes tab
  function quotePost(msg: Message) {
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

  async function rollDice() {
    const s = parseInt(diceSides)
    if (isNaN(s) || s < 2 || s > 100) return
    setDiceRolling(true)
    await fetch(`/api/games/${gameId}/dice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sides: s }),
    })
    setDiceRolling(false)
  }

  async function send() {
    const text = activeTab === 'ooc' ? oocContent : content
    if (!text.trim() || text.replace(/<[^>]*>/g, '').trim() === '' || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/games/${gameId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, type: activeTab }),
      })
      if (!res.ok) { alert(t('errors.sendingMessage') as string); return }
      if (activeTab === 'ooc') { setOocContent(''); setOocSendKey(k => k + 1) }
      else { setContent(''); setSendKey(k => k + 1) }
    } catch { alert(t('errors.networkError') as string) }
    finally { setSending(false) }
  }

  async function leave() {
    if (!leaveReason) { alert(t('errors.selectLeaveReason') as string); return }
    await fetch(`/api/games/${gameId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: leaveReason }),
    })
    router.push('/my/games')
  }

  async function report() {
    await fetch(`/api/games/${gameId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reportReason }),
    })
    setShowReport(false)
    alert(t('game.reportSent') as string)
  }

  function isSMSOnly(html: string): boolean {
    const rest = html.trim().replace(/<div class="sms-bubble">[\s\S]*?<\/div>/g, '').trim()
    return rest === '' || rest === '<p></p>'
  }

  function htmlToText(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent ?? div.innerText ?? ''
  }

  function downloadFile(fileContent: string, filename: string, mime: string) {
    const blob = new Blob([fileContent], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function exportTxt() {
    const title = requestTitle ?? t('game.historyFallback') as string
    const lines = [`${title}\n${'='.repeat(title.length)}\n`]
    for (const msg of icMessages) {
      const date = new Date(msg.created_at).toLocaleString('ru')
      lines.push(`[${date}] ${msg.nickname}${msg.edited_at ? ` (${t('game.editedShort') as string})` : ''}`)
      lines.push(htmlToText(msg.content))
      lines.push('')
    }
    downloadFile(lines.join('\n'), `${title}.txt`, 'text/plain;charset=utf-8')
    setShowExport(false)
  }

  function exportHtml() {
    const title = requestTitle ?? t('game.historyFallback') as string
    const rows = icMessages.map(msg => {
      const date = new Date(msg.created_at).toLocaleString('ru')
      return `<div class="msg">
  <div class="meta">${escapeHtml(msg.nickname)}${msg.edited_at ? ` <span class="edited">(${t('game.editedShort') as string})</span>` : ''} · <span class="date">${date}</span></div>
  <div class="body">${msg.content}</div>
</div>`
    }).join('\n')
    const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 3rem auto; padding: 0 1.5rem; color: #1c1813; background: #f7f3eb; line-height: 1.7; }
  h1 { font-size: 2rem; font-style: italic; font-weight: 300; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 2rem; }
  .msg { margin-bottom: 2rem; }
  .meta { font-family: monospace; font-size: 0.75rem; letter-spacing: 0.05em; color: #666; margin-bottom: 0.4rem; }
  .body { background: #fff; border: 1px solid #ddd; padding: 1rem 1.25rem; }
  p { margin: 0 0 0.75em; } p:last-child { margin-bottom: 0; }
</style></head><body><h1>${escapeHtml(title)}</h1>${rows}</body></html>`
    downloadFile(html, `${title}.html`, 'text/html;charset=utf-8')
    setShowExport(false)
  }

  function exportMd() {
    const title = requestTitle ?? t('game.historyFallback') as string
    const lines = [`# ${title}\n`]
    for (const msg of icMessages) {
      const date = new Date(msg.created_at).toLocaleString('ru')
      lines.push(`### ${msg.nickname}${msg.edited_at ? ` *(${t('game.editedShort') as string})*` : ''} — ${date}\n`)
      lines.push(htmlToText(msg.content))
      lines.push('\n---\n')
    }
    downloadFile(lines.join('\n'), `${title}.md`, 'text/markdown;charset=utf-8')
    setShowExport(false)
  }

  function exportPdf() {
    const title = requestTitle ?? t('game.historyFallback') as string
    const rows = icMessages.map(msg => {
      const date = new Date(msg.created_at).toLocaleString('ru')
      return `<div class="msg">
  <div class="meta">${escapeHtml(msg.nickname)}${msg.edited_at ? ` <span class="edited">(${t('game.editedShort') as string})</span>` : ''} · <span class="date">${date}</span></div>
  <div class="body">${msg.content}</div>
</div>`
    }).join('\n')
    const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 3rem auto; padding: 0 1.5rem; color: #1c1813; background: #fff; line-height: 1.7; }
  h1 { font-size: 2rem; font-style: italic; font-weight: 300; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 2rem; }
  .msg { margin-bottom: 2rem; }
  .meta { font-family: monospace; font-size: 0.75rem; letter-spacing: 0.05em; color: #666; margin-bottom: 0.4rem; }
  .body { padding: 0.5rem 0; }
  p { margin: 0 0 0.75em; } p:last-child { margin-bottom: 0; }
  @media print { body { margin: 0; } }
</style></head><body><h1>${escapeHtml(title)}</h1>${rows}</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
        URL.revokeObjectURL(url)
      }
    }
    setShowExport(false)
  }

  function exportNotesTxt() {
    const title = `${t('game.notesFallback') as string} — ${requestTitle ?? t('game.gameFallback') as string}`
    const lines = notes.map(n => {
      const date = new Date(n.created_at).toLocaleString('ru')
      return `[${date}]\n${htmlToText(n.content)}`
    })
    downloadFile(lines.join('\n\n---\n\n'), `${title}.txt`, 'text/plain;charset=utf-8')
    setShowExport(false)
  }

  function exportNotesHtml() {
    const title = `${t('game.notesFallback') as string} — ${requestTitle ?? t('game.gameFallback') as string}`
    const entries = notes.map(n => {
      const date = new Date(n.created_at).toLocaleString('ru')
      return `<div class="note"><div class="meta">${date}</div><div class="body">${n.content}</div></div>`
    }).join('\n')
    const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 3rem auto; padding: 0 1.5rem; color: #1c1813; background: #f7f3eb; line-height: 1.7; }
  h1 { font-size: 2rem; font-style: italic; font-weight: 300; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 2rem; }
  .note { margin-bottom: 2rem; border: 1px solid #ddd; }
  .meta { font-family: monospace; font-size: 0.7rem; color: #888; padding: 0.4rem 1rem; border-bottom: 1px solid #eee; }
  .body { padding: 0.75rem 1rem; } blockquote { border-left: 3px solid #8b1a1a; padding-left: 1em; color: #5a4e40; margin: 0.75em 0; }
  p { margin: 0 0 0.75em; }
</style></head><body><h1>${title}</h1>${entries}</body></html>`
    downloadFile(html, `${title}.html`, 'text/html;charset=utf-8')
    setShowExport(false)
  }

  function startEdit(msg: Message) {
    setEditingId(msg.id)
    setContent(msg.content)
    setSendKey(k => k + 1)
  }

  function cancelEdit() {
    setEditingId(null)
    setContent('')
    setSendKey(k => k + 1)
  }

  async function saveEdit() {
    if (!editingId || editSaving) return
    setEditSaving(true)
    const res = await fetch(`/api/games/${gameId}/messages/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      const updated = await res.json()
      const updater = (prev: Message[]) => prev.map(m => m.id === editingId ? { ...m, content: updated.content, edited_at: updated.edited_at } : m)
      setIcMessages(updater)
      setOocMessages(updater)
      cancelEdit()
    }
    setEditSaving(false)
  }

  async function saveSettings() {
    await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banner_url: bannerUrl, banner_pref: bannerPref, nickname, avatar_url: avatarUrl, ooc_enabled: oocEnabled }),
    })
    // Update avatar and nickname on all own messages locally
    const updater = (prev: Message[]) => prev.map(m =>
      m.user_id === userId
        ? { ...m, avatar_url: avatarUrl || null, nickname }
        : m
    )
    setIcMessages(updater)
    setOocMessages(updater)
    setShowSettings(false)
    router.refresh()
  }

  function handleSpoilerClick(e: React.MouseEvent) {
    const el = e.target as HTMLElement
    if (el.classList.contains('ooc-spoiler')) el.classList.toggle('ooc-spoiler-open')
  }

  // Go to a specific page (IC or OOC)
  async function goToPage(type: 'ic' | 'ooc', page: number) {
    setPageLoading(true)
    try {
      const pageLimit = type === 'ooc' ? 100 : 30
      const res = await fetch(`/api/games/${gameId}/messages?type=${type}&page=${page}&limit=${pageLimit}`)
      const data = await res.json()
      if (type === 'ic') {
        setIcMessages(data.messages)
        setIcPage(data.page)
        setIcTotalPages(data.totalPages)
      } else {
        setOocMessages(data.messages)
        setOocPage(data.page)
        setOocTotalPages(data.totalPages)
      }
      scrollRef.current?.scrollTo({ top: 0 })
    } finally {
      setPageLoading(false)
    }
  }

  // Lazy load OOC when tab first opened
  useEffect(() => {
    if (activeTab !== 'ooc' || oocLoaded) return
    setPageLoading(true)
    fetch(`/api/games/${gameId}/messages?type=ooc&limit=100`)
      .then(r => r.json())
      .then(data => {
        setOocMessages(data.messages)
        setOocPage(data.page)
        setOocTotalPages(data.totalPages)
        setOocLoaded(true)
      })
      .finally(() => setPageLoading(false))
  }, [activeTab, gameId, oocLoaded])

  // Server-side search with debounce + AbortController
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!searchOpen || searchScope === 'notes') {
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

  // Scroll to message after page load
  useEffect(() => {
    if (!scrollToMsgId) return
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-msg-id="${scrollToMsgId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ;(el as HTMLElement).style.outline = '2px solid var(--accent)'
        setTimeout(() => { (el as HTMLElement).style.outline = '' }, 2500)
      }
      setScrollToMsgId(null)
    }, 100)
    return () => clearTimeout(timer)
  }, [scrollToMsgId, icMessages, oocMessages])

  // Search filtering (notes only client-side, IC/OOC server-side)
  const searchLower = searchQuery.toLowerCase().trim()
  const noteSearchResults = searchLower && searchScope === 'notes'
    ? notes.filter(n => htmlToText(n.content).toLowerCase().includes(searchLower))
    : []

  const isOoc = activeTab === 'ooc'
  const isNotes = activeTab === 'notes'
  const visibleMessages = isOoc ? oocMessages : icMessages
  const partner = participants.find(p => p.user_id !== userId && !p.left_at)
  const effectiveBanner = bannerPref === 'none' ? null : bannerPref === 'partner' ? (partner?.banner_url ?? null) : (bannerUrl || null)

  return (
    <div className={fullscreen ? 'fixed inset-0 z-[500] flex flex-col bg-surface' : 'flex flex-col bg-surface'} style={fullscreen ? undefined : { height: 'calc(100vh - 60px)' }}>
      {/* Banner */}
      {effectiveBanner && !fullscreen && (
        <div className="relative h-[180px] shrink-0 overflow-hidden">
          <div className="absolute inset-0" style={{ background: `url(${effectiveBanner}) center/cover` }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 px-6 py-3">
            {requestTitle && (
              <p className="font-heading italic text-[1.25rem] m-0" style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
                {requestTitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Unified top bar */}
      <div className="px-4 py-[0.35rem] border-b border-edge flex items-center shrink-0 bg-surface-2 gap-[0.4rem]">
        {/* Left: back link + tabs */}
        {!fullscreen && (
          <Link href="/my/games" className="font-mono text-[0.58rem] tracking-[0.1em] uppercase text-ink-2 mr-2 whitespace-nowrap">←</Link>
        )}
        {requestTitle && !effectiveBanner && (
          <span className="font-heading italic text-[0.9rem] text-ink-3 whitespace-nowrap overflow-hidden text-ellipsis min-w-0">{requestTitle}</span>
        )}
        {(oocEnabled || notesEnabled) && (
          <>
            {requestTitle && !effectiveBanner && <span className="w-px h-4 bg-ink-3 shrink-0" />}
            <div className="flex items-center gap-0 shrink-0">
              <button onClick={() => setActiveTab('ic')} className={tabBtnCls(activeTab === 'ic', 'ic')}>
                {t('game.history') as string}
              </button>
              {oocEnabled && (
                <button onClick={() => setActiveTab('ooc')} className={tabBtnCls(activeTab === 'ooc', 'ooc')}>
                  {t('game.offtop') as string}
                </button>
              )}
              {notesEnabled && (
                <button onClick={() => setActiveTab('notes')} className={tabBtnCls(activeTab === 'notes', 'notes')}>
                  {t('game.notes') as string} {notes.length > 0 && <span className="ml-[0.3em] opacity-60">{notes.length}</span>}
                </button>
              )}
            </div>
          </>
        )}

        {/* Right: avatars + actions */}
        <div className="ml-auto flex gap-[0.35rem] items-center">
          {!fullscreen && (
            <div className="flex gap-1 mr-[0.15rem]">
              {participants.filter(p => !p.left_at).map(p => (
                <div key={p.id} title={p.nickname} className="w-8 h-8 rounded-full overflow-hidden bg-surface-3 flex items-center justify-center shrink-0" style={{ border: `2px solid ${p.user_id === userId ? 'var(--accent)' : 'var(--border)'}` }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
                    : <span className="font-heading text-[0.8rem] text-ink-2">{p.nickname[0]}</span>
                  }
                </div>
              ))}
            </div>
          )}

          <span className="w-px h-4 bg-edge" />

          <button
            onClick={() => { setSearchOpen(s => !s); setSearchQuery(''); setSearchScope(activeTab === 'notes' ? 'notes' : activeTab === 'ooc' ? 'ooc' : 'ic') }}
            className="bg-transparent border-none p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center"
            style={{ color: 'var(--text-2)' }}
            title={t('game.search') as string}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="5.5" cy="5.5" r="4" />
              <line x1="8.8" y1="8.8" x2="13" y2="13" />
            </svg>
          </button>
          <button onClick={() => setShowExport(true)} className="bg-transparent border-none text-ink-2 p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center" title={t('game.export') as string}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="1" x2="7" y2="9" />
              <polyline points="4,6 7,9 10,6" />
              <line x1="2" y1="12" x2="12" y2="12" />
            </svg>
          </button>
          {!isLeft && (
            <>
              <button onClick={() => setShowSettings(true)} className="bg-transparent border-none text-ink-2 p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center" title={t('game.settings') as string}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
              <button onClick={() => setShowReport(true)} className="bg-transparent border-none text-ink-2 p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center" title={t('game.report') as string}>
                <svg width="13" height="14" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 1v14M2 1h9l-2.5 3.5L11 8H2"/>
                </svg>
              </button>
              <span className="w-px h-4 bg-edge" />
              <button onClick={() => setShowLeave(true)} className="bg-transparent border-none text-ink-2 p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center" title={t('game.leaveGame') as string}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/>
                  <path d="M17 8l4 4-4 4"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </>
          )}

          <span className="w-px h-4 bg-edge" />
          <button
            onClick={() => setFullscreen(f => { const next = !f; if (next) setEditorCollapsed(true); else setEditorCollapsed(false); return next; })}
            title={fullscreen ? t('game.exitFullscreen') as string : t('game.fullscreen') as string}
            className="bg-transparent border-none text-ink-2 p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center"
          >
            {fullscreen ? (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,6 6,6 6,2"/><polyline points="8,2 8,6 12,6"/>
                <polyline points="12,8 8,8 8,12"/><polyline points="6,12 6,8 2,8"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1,5 1,1 5,1"/><polyline points="9,1 13,1 13,5"/>
                <polyline points="13,9 13,13 9,13"/><polyline points="5,13 1,13 1,9"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="px-4 py-2 border-b border-edge bg-surface-2 flex gap-2 items-center shrink-0">
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('game.searchPlaceholder') as string}
            className="flex-1 font-mono text-[0.8rem] bg-surface border border-edge text-ink p-[0.3rem_0.55rem] outline-none"
          />
          <div className="flex gap-1">
            {(['ic', 'ooc', 'notes'] as const).map(s => (
              <button key={s} onClick={() => setSearchScope(s)} className={`font-mono text-[0.55rem] tracking-[0.08em] uppercase p-[0.2rem_0.4rem] cursor-pointer ${searchScope === s ? 'bg-surface-3 border border-edge text-ink' : 'bg-transparent border border-transparent text-ink-2'}`}>
                {s === 'ic' ? 'IC' : s === 'ooc' ? 'OOC' : 'Notes'}
              </button>
            ))}
          </div>
          <button onClick={() => setSearchOpen(false)} className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.9rem]">✕</button>
        </div>
      )}

      {/* Search results */}
      {searchOpen && searchQuery && (
        <div className="max-h-60 overflow-y-auto bg-surface-2 border-b border-edge shrink-0">
          {searchScope === 'notes' ? (
            noteSearchResults.length === 0 ? (
              <p className="px-6 py-3 font-mono text-[0.75rem] text-edge">{t('game.notFound') as string}</p>
            ) : (
              noteSearchResults.map(note => {
                const plain = htmlToText(note.content)
                const idx = plain.toLowerCase().indexOf(searchLower)
                const snippet = idx >= 0 ? '…' + plain.slice(Math.max(0, idx - 30), idx + 60) + '…' : plain.slice(0, 80)
                const date = new Date(note.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={note.id} className="px-6 py-[0.65rem] border-b border-edge cursor-pointer hover:bg-surface-3 transition-colors"
                    onClick={() => {
                      setActiveTab('notes')
                      setTimeout(() => {
                        const el = document.querySelector(`[data-note-id="${note.id}"]`)
                        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as HTMLElement).style.outline = '2px solid var(--accent)'; setTimeout(() => { (el as HTMLElement).style.outline = '' }, 2000) }
                      }, 100)
                    }}>
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
                onClick={async () => {
                  setActiveTab(searchScope === 'ooc' ? 'ooc' : 'ic')
                  await goToPage(searchScope === 'ooc' ? 'ooc' : 'ic', r.page)
                  setScrollToMsgId(r.id)
                }}>
                <span className="font-mono text-[0.58rem] text-ink-2 mr-2">{r.nickname}</span>
                <span className="font-mono text-[0.55rem] text-edge mr-2">{t('game.page') as string} {r.page}</span>
                <span className="font-mono text-[0.78rem] text-ink">{r.snippet}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Moderation banner */}
      {isFrozen && (
        <div className="px-6 py-2 text-center bg-[#c0392b22] border-b border-[#c0392b44] font-mono text-[0.75rem] text-[#c0392b] tracking-wide">
          {game.moderation_status === 'hidden'
            ? t('admin.gameHiddenBanner') as string
            : t('admin.gameResolvedBanner') as string}
        </div>
      )}

      {/* ── NOTES TAB ── */}
      {isNotes ? (
        <div className="flex-1 flex flex-col bg-surface overflow-hidden">
          {/* Notes list */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col" style={{ gap: 'var(--game-gap, 1.5rem)' }}>
            {notesLoading && (
              <p className="font-mono text-[0.75rem] text-ink-2 text-center mt-8">{t('game.loading') as string}</p>
            )}
            {!notesLoading && notes.length === 0 && (
              <p className="font-heading italic text-ink-2 text-center mt-8 text-[1rem]">
                {t('game.noNotes') as string}
              </p>
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
                  {/* Note header */}
                  <div className="px-3 py-[0.4rem] border-b border-edge flex justify-between items-center bg-surface-3">
                    <div className="flex flex-col gap-[0.1rem] min-w-0">
                      {note.title && (
                        <span className="font-heading italic text-[0.82rem] text-ink overflow-hidden text-ellipsis whitespace-nowrap">
                          {note.title}
                        </span>
                      )}
                      <span className="font-mono text-[0.58rem] text-ink-2 tracking-[0.06em]">
                        {dateStr}
                        {wasEdited && <span className="ml-[0.5em] opacity-55">· {t('game.edited') as string}</span>}
                      </span>
                    </div>
                    {!isEditing && !isDeleteConfirm && (
                      <div className="flex gap-[0.1rem]">
                        <button
                          onClick={() => { setNoteEditingId(note.id); setNoteEditTitle(note.title); setNoteEditContent(note.content) }}
                          title={t('game.editNote') as string}
                          className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.78rem] p-[0.1rem_0.25rem] leading-none"
                        >✎</button>
                        <button
                          onClick={() => setDeleteConfirmId(note.id)}
                          title={t('game.deleteNote') as string}
                          className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.78rem] p-[0.1rem_0.25rem] leading-none"
                        >✕</button>
                      </div>
                    )}
                    {isDeleteConfirm && (
                      <div className="flex gap-[0.4rem] items-center">
                        <span className="font-mono text-[0.6rem] text-ink-2">{t('game.deleteConfirm') as string}</span>
                        <button onClick={() => deleteNote(note.id)} className="bg-[#c0392b] text-white border-none font-mono text-[0.6rem] p-[0.2rem_0.5rem] cursor-pointer">{t('myRequests.yes') as string}</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="bg-transparent border border-edge text-ink-2 font-mono text-[0.6rem] p-[0.2rem_0.5rem] cursor-pointer">{t('myRequests.no') as string}</button>
                      </div>
                    )}
                  </div>

                  {/* Note body */}
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={noteEditTitle}
                        onChange={e => setNoteEditTitle(e.target.value)}
                        placeholder={t('game.noteTitlePlaceholder') as string}
                        className="block w-full box-border px-3 py-2 border-none border-b border-edge bg-surface-2 text-ink font-heading italic text-[0.9rem] outline-none"
                      />
                      <RichEditor content={noteEditContent} onChange={setNoteEditContent} minHeight="100px" />
                      <div className="flex gap-2 justify-end px-3 py-[0.4rem] border-t border-edge">
                        <button onClick={() => setNoteEditingId(null)} className="btn-ghost text-[0.7rem] p-[0.3rem_0.7rem]">
                          {t('game.cancel') as string}
                        </button>
                        <button onClick={() => saveNoteEdit(note.id)} disabled={noteEditSaving} className="bg-accent-2 text-white font-heading italic text-[0.85rem] border-none p-[0.3rem_0.9rem] cursor-pointer">
                          {noteEditSaving ? '...' : t('game.save') as string}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        className="tiptap-content p-[0.75rem_0.9rem] relative"
                        style={{
                          maxHeight: isLong && !isExpanded ? '8em' : 'none',
                          overflow: isLong && !isExpanded ? 'hidden' : 'visible',
                        }}
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                      {isLong && (
                        <button
                          onClick={() => toggleNoteExpand(note.id)}
                          className="block w-full text-center font-mono text-[0.6rem] tracking-[0.08em] text-accent-2 bg-transparent border-none border-t border-edge p-[0.35rem] cursor-pointer"
                        >
                          {isExpanded ? t('game.noteCollapse') as string : t('game.noteExpand') as string}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* New note editor */}
          {isLeft && (
            <div className="px-6 py-4 text-center bg-surface-2 border-t border-edge font-heading italic text-ink-2 shrink-0">
              {t('game.youLeft') as string}
            </div>
          )}
          {!isLeft && !isFrozen && <div className="border-t border-edge bg-surface-2 shrink-0">
            {editorCollapsed ? (
              <button
                onClick={() => setEditorCollapsed(false)}
                className="w-full bg-transparent border-none p-[0.55rem_1.25rem] cursor-pointer flex items-center justify-center text-ink-2 opacity-50"
                title={t('game.addNote') as string}
              >
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="1" width="18" height="12" rx="2"/>
                  <line x1="4" y1="5" x2="4" y2="5" strokeWidth="2"/><line x1="7" y1="5" x2="7" y2="5" strokeWidth="2"/>
                  <line x1="10" y1="5" x2="10" y2="5" strokeWidth="2"/><line x1="13" y1="5" x2="13" y2="5" strokeWidth="2"/>
                  <line x1="16" y1="5" x2="16" y2="5" strokeWidth="2"/>
                  <line x1="4" y1="9" x2="4" y2="9" strokeWidth="2"/><line x1="7" y1="9" x2="16" y2="9" strokeWidth="2"/>
                </svg>
              </button>
            ) : (
              <>
              <input
                key={`title-${newNoteKey}`}
                type="text"
                value={newNoteTitle}
                onChange={e => setNewNoteTitle(e.target.value)}
                placeholder={t('game.noteTitlePlaceholder') as string}
                className="block w-full box-border px-3 py-2 border-none border-b border-edge bg-surface-2 text-ink font-heading italic text-[0.9rem] outline-none"
              />
              <RichEditor key={newNoteKey} content={newNoteContent} onChange={setNewNoteContent} placeholder={t('game.newNotePlaceholder') as string} minHeight="80px" />
              <div className="flex justify-end items-center gap-2 px-3 py-2">
                {fullscreen && (
                  <button onClick={() => setEditorCollapsed(true)} title={t('game.collapseEditor') as string} className="bg-transparent border-none text-ink-2 cursor-pointer font-mono text-[0.75rem] p-[0.2rem_0.5rem]">
                    {t('game.collapseEditor') as string}
                  </button>
                )}
                <button
                  onClick={submitNote}
                  disabled={newNoteSending || !newNoteContent.trim() || newNoteContent === '<p></p>'}
                  className="bg-accent-2 text-white font-heading italic text-[0.95rem] border-none p-[0.55rem_1.5rem] cursor-pointer"
                  style={{ opacity: (newNoteSending || !newNoteContent.trim() || newNoteContent === '<p></p>') ? 0.6 : 1 }}
                >
                  {newNoteSending ? '...' : t('game.addNoteButton') as string}
                </button>
              </div>
              </>
            )}
          </div>}
        </div>
      ) : (
        <>
          {/* Messages area */}
          <div
            ref={scrollRef}
            onClick={handleSpoilerClick}
            onScroll={handleMessagesScroll}
            className={`flex-1 overflow-y-auto flex flex-col ${isOoc ? 'bg-surface-3 gap-3' : 'bg-surface'}`}
            style={{ ...(!isOoc ? { gap: 'var(--game-gap, 1.5rem)' } : {}), padding: fullscreen ? '1.5rem 6rem' : (!isOoc && gameLayout === 'dialog') ? '1.5rem 4rem' : '1.5rem' }}
          >
            {pageLoading && (
              <div className="flex items-center justify-center py-8">
                <span className="font-mono text-[0.75rem] text-ink-2">{t('game.loading') as string}</span>
              </div>
            )}
            {isOoc && (
              <p className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-ink-2 text-center p-2 border-b border-edge mb-2">
                {t('game.offtopLabel') as string}
              </p>
            )}
            {visibleMessages.length === 0 && (
              <p className="font-heading italic text-ink-2 text-center mt-8">
                {isOoc ? t('game.emptyOoc') as string : t('game.emptyIc') as string}
              </p>
            )}
            <div className={!isOoc && gameLayout === 'feed' ? 'max-w-[1050px] mx-auto w-full flex flex-col' : 'contents'} style={!isOoc && gameLayout === 'feed' ? { gap: 'var(--game-gap, 1.5rem)' } : undefined}>
            {visibleMessages.map(msg => {
              const isMine = msg.user_id === userId
              const isEditing = editingId === msg.id
              const smsOnly = isSMSOnly(msg.content)
              return isOoc
                ? (
                  <div key={msg.id} data-msg-id={msg.id} className="flex gap-[0.6rem] items-start">
                    <div className="w-7 h-7 rounded-full shrink-0 bg-surface-2 overflow-hidden flex items-center justify-center" style={{ border: `1px solid ${isMine ? 'var(--text-2)' : 'var(--border)'}` }}>
                      {msg.avatar_url
                        ? <img src={msg.avatar_url} alt={msg.nickname} className="w-full h-full object-cover" />
                        : <span className="font-mono text-[0.65rem] text-ink-2">{msg.nickname[0]}</span>
                      }
                    </div>
                    <div className="flex-1">
                      <span className={`font-mono text-[0.62rem] mr-2 ${isMine ? 'text-ink' : 'text-ink-2'}`}>
                        {msg.nickname}
                      </span>
                      <span className="font-mono text-[0.55rem] text-edge tracking-[0.04em]">
                        {new Date(msg.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {msg.edited_at && ` (${t('game.editedShort') as string})`}
                      </span>
                      <MsgContent
                        className="tiptap-content"
                        style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '0.2rem', color: 'var(--text)', minHeight: 'unset' }}
                        html={msg.content}
                      />
                    </div>
                  </div>
                )
                : gameLayout === 'book' && !smsOnly ? (
                  /* ── BOOK: без аватарок, имя курсивом перед постом ── */
                  <div key={msg.id} data-msg-id={msg.id} className="max-w-[1550px] mx-auto w-full px-8">
                    <div className="flex items-baseline justify-between gap-3 pb-[0.35rem] mb-[0.4rem]" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                      <span className="font-heading text-[1rem] text-ink-2 italic">
                        {msg.nickname}
                        <span className="ml-[0.6em] not-italic font-mono text-[0.6rem] opacity-40 tracking-[0.04em]">
                          {new Date(msg.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.edited_at && <span className="ml-[0.4em] opacity-50 text-[0.75rem] not-italic font-mono">({t('game.editedShort') as string})</span>}
                      </span>
                      <span className="inline-flex gap-[0.3rem] shrink-0">
                        {notesEnabled && (
                          <button onClick={() => quotePost(msg)} className="bg-transparent border-none text-ink-2 cursor-pointer font-heading text-[0.85rem] p-0 leading-none">«…»</button>
                        )}
                        {isMine && !isLeft && (
                          <button onClick={() => isEditing ? cancelEdit() : startEdit(msg)} title={isEditing ? t('game.cancel') as string : t('game.editNote') as string} className="bg-transparent border-none cursor-pointer p-0 leading-none align-middle" style={{ color: isEditing ? 'var(--accent)' : 'var(--text-2)' }}>
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z"/></svg>
                          </button>
                        )}
                      </span>
                    </div>
                    <MsgContent
                      className="tiptap-content"
                      style={{ overflowWrap: 'break-word', wordBreak: 'break-word', background: 'transparent', border: 'none', padding: '0.1rem 0' }}
                      html={msg.content}
                    />
                  </div>
                ) : (
                  /* ── DIALOG / FEED (+ book+sms) ── */
                  <div key={msg.id} data-msg-id={msg.id} className="flex gap-[0.85rem] items-start" style={{
                    flexDirection: (gameLayout === 'dialog' || gameLayout === 'feed') ? (isMine ? 'row-reverse' : 'row') : 'row',
                    ...(smsOnly && gameLayout !== 'feed' ? { maxWidth: '860px', marginLeft: 'auto', marginRight: 'auto', width: '100%' } : {}),
                    ...(gameLayout === 'feed' ? { padding: '0.75rem 1rem' } : {}),
                  }}>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full shrink-0 bg-surface-3 overflow-hidden flex items-center justify-center" style={{ border: `2px solid ${isMine ? 'var(--accent)' : 'var(--border)'}` }}>
                      {msg.avatar_url ? <img src={msg.avatar_url} alt={msg.nickname} className="w-full h-full object-cover" /> : <span className="font-heading text-[0.85rem] text-ink-2">{msg.nickname[0]}</span>}
                    </div>
                    <div className="min-w-0 flex-1" style={{ maxWidth: gameLayout === 'feed' ? '100%' : '72%' }}>
                      {smsOnly ? (
                        <>
                          <p className="font-mono text-[0.58rem] tracking-[0.08em] mb-[0.2rem] font-semibold" style={{ color: isMine ? 'var(--accent)' : 'var(--text-2)', textAlign: (gameLayout === 'dialog' || gameLayout === 'feed') && isMine ? 'right' : 'left' }}>
                            {msg.nickname}
                            {isMine && !isLeft && (
                              <button onClick={() => isEditing ? cancelEdit() : startEdit(msg)} title={isEditing ? t('game.cancel') as string : t('game.editNote') as string} className="ml-[0.5em] bg-transparent border-none cursor-pointer p-0 leading-none align-middle" style={{ color: isEditing ? 'var(--accent)' : 'var(--text-2)' }}>
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z"/></svg>
                                </button>
                            )}
                          </p>
                          <p className="sms-meta" style={{ textAlign: (gameLayout === 'dialog' || gameLayout === 'feed') && isMine ? 'right' : 'left', marginBottom: '0.25em', marginTop: 0 }}>
                            {new Date(msg.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            {msg.edited_at && ` (${t('game.editedShort') as string})`}
                          </p>
                          <MsgContent
                            className={`tiptap-content${isMine && gameLayout === 'dialog' ? ' sms-right' : ''}`}
                            style={{ overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0, background: 'transparent', border: 'none', padding: '0' }}
                            html={msg.content}
                          />
                        </>
                      ) : (
                        <>
                          <p className="font-mono text-[0.62rem] tracking-[0.1em] text-ink-2 mb-[0.3rem]" style={{ textAlign: (gameLayout === 'dialog' || gameLayout === 'feed') && isMine ? 'right' : 'left' }}>
                            {msg.nickname}
                            <span className="ml-[0.5em] opacity-40 tracking-[0.04em]">
                              {new Date(msg.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.edited_at && <span className="ml-[0.4em] opacity-60">({t('game.editedShort') as string})</span>}
                            {notesEnabled && (
                              <button onClick={() => quotePost(msg)} className="ml-[0.5em] bg-transparent border-none text-ink-2 cursor-pointer font-heading text-[0.85rem] p-0 leading-none">«…»</button>
                            )}
                            {isMine && !isLeft && (
                              <button onClick={() => isEditing ? cancelEdit() : startEdit(msg)} title={isEditing ? t('game.cancel') as string : t('game.editNote') as string} className="ml-[0.5em] bg-transparent border-none cursor-pointer p-0 leading-none align-middle" style={{ color: isEditing ? 'var(--accent)' : 'var(--text-2)' }}>
                                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z"/></svg>
                                </button>
                            )}
                          </p>
                          <MsgContent
                            className="tiptap-content"
                            style={{
                              overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0,
                              ...(gameLayout === 'feed' ? {
                                background: 'transparent', borderTop: 'none', borderBottom: 'none', padding: '0',
                                borderLeft: !isMine ? `3px solid ${feedPostBg(msg.user_id).replace('0.10', '0.35')}` : 'none',
                                borderRight: isMine ? `3px solid ${feedPostBg(msg.user_id).replace('0.10', '0.35')}` : 'none',
                              } : {
                                background: isMine ? 'var(--post-mine-bg)' : 'transparent',
                                borderTop: 'none', borderBottom: 'none',
                                borderLeft: isMine ? 'none' : `2px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}`,
                                borderRight: isMine ? `2px solid ${isEditing ? 'var(--accent)' : 'var(--post-mine-stripe)'}` : 'none',
                                padding: '0.75rem 1.25rem', borderRadius: 0,
                              }),
                            }}
                            html={msg.content}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )
            })}
            </div>
            <div ref={bottomRef} />
          </div>

          {/* Pagination */}
          {(() => {
            const currentPage = isOoc ? oocPage : icPage
            const total = isOoc ? oocTotalPages : icTotalPages
            if (total <= 1) return null
            return (
              <div className="flex items-center justify-center gap-1 py-2 px-4 border-t border-edge bg-surface-2 shrink-0">
                <button
                  onClick={() => goToPage(isOoc ? 'ooc' : 'ic', 1)}
                  disabled={currentPage === 1 || pageLoading}
                  className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30"
                >«</button>
                <button
                  onClick={() => goToPage(isOoc ? 'ooc' : 'ic', currentPage - 1)}
                  disabled={currentPage === 1 || pageLoading}
                  className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30"
                >‹</button>
                {paginationRange(currentPage, total).map((p, i) =>
                  p === '...' ? (
                    <span key={`dot-${i}`} className="font-mono text-[0.6rem] text-ink-2 px-1">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(isOoc ? 'ooc' : 'ic', p as number)}
                      disabled={pageLoading}
                      className="font-mono text-[0.65rem] border p-[0.2rem_0.45rem] cursor-pointer min-w-[1.6rem] text-center"
                      style={{
                        background: p === currentPage ? 'var(--accent-dim)' : 'transparent',
                        borderColor: p === currentPage ? 'var(--accent)' : 'var(--border)',
                        color: p === currentPage ? 'var(--accent)' : 'var(--text-2)',
                        fontWeight: p === currentPage ? 600 : 400,
                      }}
                    >{p}</button>
                  )
                )}
                <button
                  onClick={() => goToPage(isOoc ? 'ooc' : 'ic', currentPage + 1)}
                  disabled={currentPage === total || pageLoading}
                  className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30"
                >›</button>
                <button
                  onClick={() => goToPage(isOoc ? 'ooc' : 'ic', total)}
                  disabled={currentPage === total || pageLoading}
                  className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30"
                >»</button>
              </div>
            )
          })()}

          {/* Input */}
          {!isLeft && !isFrozen && (
            <div className="shrink-0" onMouseEnter={() => editorCollapsed && setEditorCollapsed(false)} style={{
              borderTop: `1px solid ${editingId && !isOoc ? 'var(--accent)' : isOoc ? 'var(--text-2)' : 'var(--border)'}`,
              background: isOoc ? 'var(--bg-3)' : 'var(--bg-2)',
            }}>
            {editorCollapsed && !editingId ? (
              <button
                onClick={() => setEditorCollapsed(false)}
                className="w-full bg-transparent border-none p-[0.55rem_1.25rem] cursor-pointer flex items-center justify-center text-ink-2 opacity-50"
                title={t('game.writePost') as string}
              >
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="1" width="18" height="12" rx="2"/>
                  <line x1="4" y1="5" x2="4" y2="5" strokeWidth="2"/><line x1="7" y1="5" x2="7" y2="5" strokeWidth="2"/>
                  <line x1="10" y1="5" x2="10" y2="5" strokeWidth="2"/><line x1="13" y1="5" x2="13" y2="5" strokeWidth="2"/>
                  <line x1="16" y1="5" x2="16" y2="5" strokeWidth="2"/>
                  <line x1="4" y1="9" x2="4" y2="9" strokeWidth="2"/><line x1="7" y1="9" x2="16" y2="9" strokeWidth="2"/>
                </svg>
              </button>
            ) : (
              <div style={{ animation: 'fadeInUp 0.3s ease' }}>
              {editingId && !isOoc && (
                <div className="flex items-center justify-between px-3 py-1 bg-accent-dim border-b border-accent">
                  <span className="font-mono text-[0.62rem] text-ink-2 tracking-[0.06em]">
                    {t('game.editingPost') as string}
                  </span>
                  <button onClick={cancelEdit} className="bg-transparent border-none text-ink-2 cursor-pointer font-mono text-[0.62rem] p-0">
                    {t('game.cancelEdit') as string}
                  </button>
                </div>
              )}
              {isOoc
                ? <RichEditor key={oocSendKey} content={oocContent} onChange={setOocContent} placeholder={t('game.oocPlaceholder') as string} minHeight="80px" />
                : <RichEditor key={sendKey} content={content} onChange={setContent} placeholder={t('game.icPlaceholder') as string} minHeight="100px" onDiceClick={!editingId ? () => setShowDicePanel(v => !v) : undefined} diceActive={showDicePanel} />
              }
              {showDicePanel && !editingId && (
                <div className="flex items-center gap-2 px-3 py-[0.4rem] bg-surface-2 border-t border-edge">
                  <span className="font-mono text-[0.7rem] text-ink-2 tracking-[0.08em]">d</span>
                  <input
                    type="number" min={2} max={100} value={diceSides}
                    onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 0 && Number(v) <= 100)) setDiceSides(v) }}
                    onKeyDown={e => { if (e.key === 'Enter') rollDice() }}
                    className="w-14 font-mono text-[0.8rem] bg-surface border border-edge text-ink p-[0.2rem_0.4rem] text-center"
                  />
                  <span className="font-mono text-[0.55rem] text-edge tracking-[0.04em]">2–100</span>
                  <button
                    onClick={rollDice} disabled={diceRolling || isNaN(parseInt(diceSides)) || parseInt(diceSides) < 2 || parseInt(diceSides) > 100}
                    className="bg-accent text-white font-heading italic text-[0.85rem] border-none p-[0.25rem_0.9rem] cursor-pointer"
                    style={{ opacity: (diceRolling || isNaN(parseInt(diceSides)) || parseInt(diceSides) < 2 || parseInt(diceSides) > 100) ? 0.4 : 1 }}
                  >
                    {diceRolling ? '...' : t('game.roll') as string}
                  </button>
                </div>
              )}
              <div className={`flex items-center gap-2 px-3 py-2 ${!editingId ? 'justify-between' : 'justify-end'}`}>
                <div className="flex items-center gap-2">
                  {!editingId && (
                    <button
                      onClick={() => setEditorPinned(p => !p)}
                      title={editorPinned ? t('game.unpinEditor') as string : t('game.pinEditor') as string}
                      className="bg-transparent border-none cursor-pointer p-[0.2rem_0.4rem] leading-none flex items-center"
                      style={{ color: editorPinned ? 'var(--accent)' : 'var(--text-2)', opacity: editorPinned ? 1 : 0.5 }}
                    >
                      {editorPinned ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                        </svg>
                      )}
                    </button>
                  )}
                  {fullscreen && !editingId && (
                    <button onClick={() => setEditorCollapsed(true)} title={t('game.collapseEditor') as string} className="bg-transparent border-none text-ink-2 cursor-pointer font-mono text-[0.75rem] p-[0.2rem_0.5rem] leading-none">
                      {t('game.collapseEditorBtn') as string}
                    </button>
                  )}
                </div>
                <button
                  onClick={editingId && !isOoc ? saveEdit : send}
                  disabled={editSaving || sending || !(isOoc ? oocContent : content).trim()}
                  className="text-white font-heading italic text-[0.95rem] border-none p-[0.55rem_1.5rem] cursor-pointer"
                  style={{
                    background: isOoc ? 'var(--text-2)' : 'var(--accent)',
                    opacity: (!(isOoc ? oocContent : content).trim() || sending || editSaving) ? 0.6 : 1,
                  }}
                >
                  {(sending || editSaving) ? '...' : editingId && !isOoc ? t('game.sendSave') as string : isOoc ? t('game.sendOoc') as string : t('game.sendIc') as string}
                </button>
              </div>
              </div>
            )}
            </div>
          )}
          {isLeft && (
            <div className="px-6 py-4 text-center bg-surface-2 border-t border-edge font-heading italic text-ink-2">
              {t('game.youLeft') as string}
            </div>
          )}
        </>
      )}

      {/* Quote toast */}
      {quoteToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-surface font-mono text-[0.7rem] tracking-[0.08em] px-[1.1rem] py-2 z-[600] pointer-events-none">
          {t('game.quotedToNotes') as string}
        </div>
      )}

      {/* Dice popup */}
      {diceQueue.length > 0 && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDiceQueue(q => q.slice(1))}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-surface border border-edge p-[2rem_3rem] text-center min-w-[200px]"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}
          >
            <p className="font-mono text-[0.6rem] text-ink-2 tracking-[0.15em] uppercase mb-3">
              {diceQueue[0].roller} · d{diceQueue[0].sides}
              {diceQueue.length > 1 && <span className="ml-3 opacity-50">+{diceQueue.length - 1}</span>}
            </p>
            <p className="font-heading text-[4rem] text-accent italic leading-none mb-6">
              {diceQueue[0].result}
            </p>
            <button
              onClick={() => setDiceQueue(q => q.slice(1))}
              className="btn-ghost text-[0.65rem] tracking-[0.1em] p-[0.35rem_1.25rem]"
            >
              {diceQueue.length > 1 ? t('game.diceNext') as string : t('game.diceClose') as string}
            </button>
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExport && (
        <Modal onClose={() => setShowExport(false)} title={t('game.exportTitle') as string}>
          <p className="text-ink-2 font-body mb-4 text-[0.9rem]">
            {t('game.exportGameHistory') as string}
          </p>
          <div className="flex gap-3 mb-6 flex-wrap">
            <button onClick={exportTxt} className="flex-1 min-w-[100px] bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
              .txt
            </button>
            <button onClick={exportHtml} className="flex-1 min-w-[100px] bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
              .html
            </button>
            <button onClick={exportMd} className="flex-1 min-w-[100px] bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
              .md
            </button>
            <button onClick={exportPdf} className="flex-1 min-w-[100px] bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
              PDF
            </button>
          </div>
          {notesEnabled && notes.length > 0 && (
            <>
              <p className="text-ink-2 font-body mb-4 text-[0.9rem]">
                {t('game.exportMyNotes') as string}
              </p>
              <div className="flex gap-3">
                <button onClick={exportNotesTxt} className="flex-1 bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
                  .txt
                </button>
                <button onClick={exportNotesHtml} className="flex-1 bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
                  .html
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Leave modal */}
      {showLeave && (
        <Modal onClose={() => setShowLeave(false)} title={t('game.leaveTitle') as string}>
          <p className="text-ink-2 font-body mb-5">
            {t('game.leavePrompt') as string}
          </p>
          <div className="flex flex-col gap-2 mb-5">
            {(t('game.leaveReasons') as readonly string[]).map((r: string) => (
              <label key={r} className="flex items-center gap-[0.6rem] cursor-pointer font-body" style={{ color: leaveReason === r ? 'var(--accent)' : 'var(--text)' }}>
                <input type="radio" value={r} checked={leaveReason === r} onChange={() => setLeaveReason(r)} style={{ accentColor: 'var(--accent)' }} />
                {r}
              </label>
            ))}
          </div>
          <button onClick={leave} className="bg-[#c0392b] text-white font-heading italic border-none p-[0.6rem_1.4rem] cursor-pointer">
            {t('game.leaveButton') as string}
          </button>
        </Modal>
      )}

      {/* Report modal */}
      {showReport && (
        <Modal onClose={() => setShowReport(false)} title={t('game.reportTitle') as string}>
          <textarea
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            placeholder={t('game.reportPlaceholder') as string}
            rows={4}
            className="w-full font-body text-[1rem] bg-surface border border-edge text-ink p-[0.65rem] outline-none resize-y mb-4"
          />
          <button onClick={report} className="btn-primary p-[0.6rem_1.4rem] text-[1rem]">
            {t('game.reportButton') as string}
          </button>
        </Modal>
      )}

      {/* Settings modal */}
      {showSettings && (
        <Modal onClose={() => setShowSettings(false)} title={t('game.settingsTitle') as string}>
          <div className="flex flex-col gap-5">
            {/* ── Character ── */}
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-2 border-b border-edge pb-1">{t('game.characterSection') as string}</span>
              <label className="flex flex-col gap-[0.3rem]">
                <span className="font-mono text-[0.62rem] tracking-[0.1em] text-ink-2">{t('game.nicknameLabel') as string}</span>
                <input value={nickname} onChange={e => setNickname(e.target.value)} className="bg-surface-2 border border-edge text-ink font-body text-[0.95rem] p-[0.45rem_0.7rem] outline-none" maxLength={50} />
              </label>
              <label className="flex flex-col gap-[0.3rem]">
                <span className="font-mono text-[0.62rem] tracking-[0.1em] text-ink-2">{t('game.avatarLabel') as string}</span>
                <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="bg-surface-2 border border-edge text-ink font-body text-[0.95rem] p-[0.45rem_0.7rem] outline-none" placeholder="https://..." maxLength={512} />
              </label>
            </div>

            {/* ── Appearance ── */}
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-2 border-b border-edge pb-1">{t('game.decorSection') as string}</span>
              <div className="flex flex-col gap-[0.3rem]">
                <span className="font-mono text-[0.62rem] tracking-[0.1em] text-ink-2">{t('game.layoutLabel') as string}</span>
                <div className="flex gap-2">
                  {([['dialog', t('game.layoutDialog') as string], ['feed', t('game.layoutFeed') as string], ['book', t('game.layoutBook') as string]] as const).map(([val, label]) => (
                    <button key={val} onClick={() => set('gameLayout', val as 'dialog' | 'feed' | 'book')} className="flex-1 font-heading italic text-[0.85rem] border p-[0.35rem_0.5rem] cursor-pointer" style={{ background: gameLayout === val ? 'var(--accent-dim)' : 'var(--bg-2)', borderColor: gameLayout === val ? 'var(--accent)' : 'var(--border)', color: gameLayout === val ? 'var(--accent)' : 'var(--text)' }}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="font-mono text-[0.5rem] tracking-[0.04em] text-ink-2">
                  {gameLayout === 'dialog' && t('game.layoutDialogDesc') as string}
                  {gameLayout === 'feed' && t('game.layoutFeedDesc') as string}
                  {gameLayout === 'book' && t('game.layoutBookDesc') as string}
                </p>
              </div>
              <label className="flex flex-col gap-[0.3rem]">
                <span className="font-mono text-[0.62rem] tracking-[0.1em] text-ink-2">{t('game.bannerLabel') as string}</span>
                <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} className="bg-surface-2 border border-edge text-ink font-body text-[0.95rem] p-[0.45rem_0.7rem] outline-none" placeholder="https://..." maxLength={512} />
              </label>
              <div className="flex gap-3">
                {([['own', t('game.bannerOwn') as string], ['partner', t('game.bannerPartner') as string], ['none', t('game.bannerNone') as string]] as const).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="banner_pref" checked={bannerPref === val} onChange={() => setBannerPref(val as 'own' | 'partner' | 'none')} className="w-[13px] h-[13px] shrink-0" style={{ accentColor: 'var(--text-2)' }} />
                    <span className="font-mono text-[0.7rem] text-ink">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-2 border-b border-edge pb-1">{t('game.tabsSection') as string}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={oocEnabled} onChange={e => setOocEnabled(e.target.checked)} className="w-[14px] h-[14px] shrink-0" style={{ accentColor: 'var(--text-2)' }} />
                <span className="font-mono text-[0.7rem] text-ink">{t('game.oocTab') as string}</span>
                <span className="font-mono text-[0.55rem] text-ink-2">{t('game.oocDesc') as string}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={notesEnabled} onChange={e => set('notesEnabled', e.target.checked)} className="w-[14px] h-[14px] shrink-0" style={{ accentColor: 'var(--text-2)' }} />
                <span className="font-mono text-[0.7rem] text-ink">{t('game.notesTab') as string}</span>
                <span className="font-mono text-[0.55rem] text-ink-2">{t('game.notesDesc') as string}</span>
              </label>
            </div>

            <button onClick={saveSettings} className="btn-primary p-[0.5rem_1.2rem] text-[0.95rem] self-start">
              {t('game.saveSettings') as string}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function paginationRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) pages.push('...')
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total - 1) pages.push('...')
  pages.push(total)
  return pages
}

function tabBtnCls(isActive: boolean, tab: 'ic' | 'ooc' | 'notes'): string {
  const base = 'font-mono text-[0.6rem] tracking-[0.1em] uppercase p-[0.3rem_0.7rem] bg-transparent border-none cursor-pointer transition-colors duration-150'
  const color = tab === 'ic'
    ? (isActive ? 'text-accent border-b-2 border-accent' : 'text-ink-3 border-b-2 border-transparent')
    : (isActive ? 'text-ink-2 border-b-2 border-ink-2' : 'text-ink-3 border-b-2 border-transparent')
  return `${base} ${color}`
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="overlay z-[500] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal p-8 max-w-[480px] w-full">
        <button onClick={onClose} className="absolute top-4 right-4 bg-transparent border-none text-ink-2 cursor-pointer text-[1.1rem]">✕</button>
        <h2 className="font-heading text-2xl italic text-ink mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}
