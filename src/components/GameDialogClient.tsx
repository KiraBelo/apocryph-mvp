'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import RichEditor from './RichEditor'
import OocEditor from './OocEditor'
import Link from 'next/link'
import { useSettings } from './SettingsContext'

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

interface Props {
  gameId: string
  game: { id: string; request_id: string | null; banner_url: string | null; ooc_enabled: boolean }
  initialMessages: Message[]
  participants: Participant[]
  me: Participant
  userId: string
  requestTitle: string | null
}

const LEAVE_REASONS = ['Спасибо, всё было здорово', 'Сейчас нет времени продолжать', 'Формат игры не подошёл', 'Ожидания от игры не совпали', 'Сменились интересы']
const NOTE_COLLAPSE_CHARS = 350

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

export default function GameDialogClient({ gameId, game, initialMessages, participants, me, userId, requestTitle }: Props) {
  const router = useRouter()
  const { notesEnabled, gameLayout } = useSettings()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [activeTab, setActiveTab] = useState<'ic' | 'ooc' | 'notes'>('ic')
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
  const isLeft = !!me.left_at

  const icMessages = messages.filter(m => m.type !== 'ooc' && m.type !== 'dice')
  const oocMessages = messages.filter(m => m.type === 'ooc')

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
        setNotesLoading(false)
      })
  }, [activeTab, gameId, notesEnabled, notesLoaded])

  // SSE
  useEffect(() => {
    if (isLeft) return
    const es = new EventSource(`/api/games/${gameId}/messages/stream`)
    es.onmessage = e => {
      const data = JSON.parse(e.data)
      if (data._type === 'edit') {
        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, content: data.content, edited_at: data.edited_at } : m))
      } else if (data.type === 'dice') {
        try {
          const parsed = JSON.parse(data.content)
          setDiceQueue(prev => [...prev, { sides: parsed.sides, result: parsed.result, roller: parsed.roller }])
        } catch {}
        const { _type: _, ...msg } = data
        setMessages(prev => [...prev, msg as Message])
      } else {
        const { _type: _, ...msg } = data
        setMessages(prev => [...prev, msg as Message])
      }
    }
    return () => es.close()
  }, [gameId, isLeft])

  // Scroll to bottom on new message in current tab
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [icMessages.length, oocMessages.length, activeTab])

  // Submit new note
  async function submitNote() {
    if (!newNoteContent.trim() || newNoteContent === '<p></p>' || newNoteSending) return
    setNewNoteSending(true)
    const res = await fetch(`/api/games/${gameId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newNoteTitle, content: newNoteContent }),
    })
    const d = await res.json()
    if (d.note) setNotes(prev => [d.note, ...prev])
    setNewNoteTitle('')
    setNewNoteContent('')
    setNewNoteKey(k => k + 1)
    setNewNoteSending(false)
  }

  // Save note edit
  async function saveNoteEdit(noteId: number) {
    if (noteEditSaving) return
    setNoteEditSaving(true)
    const res = await fetch(`/api/games/${gameId}/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: noteEditTitle, content: noteEditContent }),
    })
    const d = await res.json()
    if (d.note) setNotes(prev => prev.map(n => n.id === noteId ? d.note : n))
    setNoteEditingId(null)
    setNoteEditSaving(false)
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
    const quoteHtml = `<blockquote><p>${text}</p><p><em>— ${msg.nickname}, ${date}</em></p></blockquote><p></p>`
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
    if (!text.trim() || sending) return
    setSending(true)
    await fetch(`/api/games/${gameId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, type: activeTab }),
    })
    if (activeTab === 'ooc') { setOocContent(''); setOocSendKey(k => k + 1) }
    else { setContent(''); setSendKey(k => k + 1) }
    setSending(false)
  }

  async function leave() {
    if (!leaveReason) { alert('Выберите причину выхода'); return }
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
    alert('Жалоба отправлена модераторам')
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
    const title = requestTitle ?? 'История'
    const lines = [`${title}\n${'='.repeat(title.length)}\n`]
    for (const msg of icMessages) {
      const date = new Date(msg.created_at).toLocaleString('ru')
      lines.push(`[${date}] ${msg.nickname}${msg.edited_at ? ' (ред.)' : ''}`)
      lines.push(htmlToText(msg.content))
      lines.push('')
    }
    downloadFile(lines.join('\n'), `${title}.txt`, 'text/plain;charset=utf-8')
    setShowExport(false)
  }

  function exportHtml() {
    const title = requestTitle ?? 'История'
    const rows = icMessages.map(msg => {
      const date = new Date(msg.created_at).toLocaleString('ru')
      return `<div class="msg">
  <div class="meta">${msg.nickname}${msg.edited_at ? ' <span class="edited">(ред.)</span>' : ''} · <span class="date">${date}</span></div>
  <div class="body">${msg.content}</div>
</div>`
    }).join('\n')
    const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 3rem auto; padding: 0 1.5rem; color: #1c1813; background: #f7f3eb; line-height: 1.7; }
  h1 { font-size: 2rem; font-style: italic; font-weight: 300; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 2rem; }
  .msg { margin-bottom: 2rem; }
  .meta { font-family: monospace; font-size: 0.75rem; letter-spacing: 0.05em; color: #666; margin-bottom: 0.4rem; }
  .body { background: #fff; border: 1px solid #ddd; padding: 1rem 1.25rem; }
  p { margin: 0 0 0.75em; } p:last-child { margin-bottom: 0; }
</style></head><body><h1>${title}</h1>${rows}</body></html>`
    downloadFile(html, `${title}.html`, 'text/html;charset=utf-8')
    setShowExport(false)
  }

  function exportNotesTxt() {
    const title = `Заметки — ${requestTitle ?? 'игра'}`
    const lines = notes.map(n => {
      const date = new Date(n.created_at).toLocaleString('ru')
      return `[${date}]\n${htmlToText(n.content)}`
    })
    downloadFile(lines.join('\n\n---\n\n'), `${title}.txt`, 'text/plain;charset=utf-8')
    setShowExport(false)
  }

  function exportNotesHtml() {
    const title = `Заметки — ${requestTitle ?? 'игра'}`
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
      setMessages(prev => prev.map(m => m.id === editingId ? { ...m, content: updated.content, edited_at: updated.edited_at } : m))
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
    setShowSettings(false)
    router.refresh()
  }

  function handleOocClick(e: React.MouseEvent) {
    const el = e.target as HTMLElement
    if (el.classList.contains('ooc-spoiler')) el.classList.toggle('ooc-spoiler-open')
  }

  // Search filtering
  const searchLower = searchQuery.toLowerCase().trim()
  const noteSearchResults = searchLower && searchScope === 'notes'
    ? notes.filter(n => htmlToText(n.content).toLowerCase().includes(searchLower))
    : []
  const msgSearchResults = searchLower && searchScope !== 'notes'
    ? (searchScope === 'ooc' ? oocMessages : icMessages).filter(m => htmlToText(m.content).toLowerCase().includes(searchLower))
    : []

  const isOoc = activeTab === 'ooc'
  const isNotes = activeTab === 'notes'
  const visibleMessages = isOoc ? oocMessages : icMessages
  const partner = participants.find(p => p.user_id !== userId && !p.left_at)
  const effectiveBanner = bannerPref === 'none' ? null : bannerPref === 'partner' ? (partner?.banner_url ?? null) : (bannerUrl || null)

  return (
    <div style={fullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 500, display: 'flex', flexDirection: 'column', background: 'var(--bg)' } : { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: 'var(--bg)' }}>
      {/* Banner */}
      {effectiveBanner && !fullscreen && (
        <div style={{ position: 'relative', height: '180px', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `url(${effectiveBanner}) center/cover` }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.75rem 1.5rem' }}>
            {requestTitle && (
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.25rem', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 6px rgba(0,0,0,0.7)', margin: 0 }}>
                {requestTitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Unified top bar */}
      <div style={{ padding: '0.35rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', flexShrink: 0, background: 'var(--bg-2)', gap: '0.4rem' }}>
        {/* Left: back link + tabs */}
        {!fullscreen && (
          <Link href="/my/games" style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>←</Link>
        )}
        {requestTitle && !effectiveBanner && (
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{requestTitle}</span>
        )}
        {(oocEnabled || notesEnabled) && (
          <>
            {requestTitle && !effectiveBanner && <span style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
              <button onClick={() => setActiveTab('ic')} style={tabBtnStyle(activeTab === 'ic', 'ic')}>
                История
              </button>
              {oocEnabled && (
                <button onClick={() => setActiveTab('ooc')} style={tabBtnStyle(activeTab === 'ooc', 'ooc')}>
                  Оффтоп
                </button>
              )}
              {notesEnabled && (
                <button onClick={() => setActiveTab('notes')} style={tabBtnStyle(activeTab === 'notes', 'notes')}>
                  Заметки {notes.length > 0 && <span style={{ marginLeft: '0.3em', opacity: 0.6 }}>{notes.length}</span>}
                </button>
              )}
            </div>
          </>
        )}

        {/* Right: avatars + actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {!fullscreen && (
            <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.15rem' }}>
              {participants.filter(p => !p.left_at).map(p => (
                <div key={p.id} title={p.nickname} style={{
                  width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden',
                  border: `2px solid ${p.user_id === userId ? 'var(--accent)' : 'var(--border)'}`,
                  background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: 'var(--serif)', fontSize: '0.8rem', color: 'var(--text-2)' }}>{p.nickname[0]}</span>
                  }
                </div>
              ))}
            </div>
          )}

          <span style={{ width: '1px', height: '16px', background: 'var(--border)' }} />

          <button
            onClick={() => { setSearchOpen(s => !s); setSearchQuery(''); setSearchScope(activeTab === 'notes' ? 'notes' : activeTab === 'ooc' ? 'ooc' : 'ic') }}
            style={{ ...topBtn, color: searchOpen ? 'var(--text)' : 'var(--text-2)' }}
            title="Поиск"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="5.5" cy="5.5" r="4" />
              <line x1="8.8" y1="8.8" x2="13" y2="13" />
            </svg>
          </button>
          <button onClick={() => setShowExport(true)} style={{ ...topBtn, color: 'var(--text-2)' }} title="Экспорт">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="1" x2="7" y2="9" />
              <polyline points="4,6 7,9 10,6" />
              <line x1="2" y1="12" x2="12" y2="12" />
            </svg>
          </button>
          {!isLeft && (
            <>
              <button onClick={() => setShowSettings(true)} style={topBtn} title="Настройки">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
              <button onClick={() => setShowReport(true)} style={topBtn} title="Пожаловаться">
                <svg width="13" height="14" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 1v14M2 1h9l-2.5 3.5L11 8H2"/>
                </svg>
              </button>
              <span style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
              <button onClick={() => setShowLeave(true)} style={{ ...topBtn, color: 'var(--accent)' }} title="Выйти из игры">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/>
                  <path d="M17 8l4 4-4 4"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </>
          )}

          <span style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
          <button
            onClick={() => setFullscreen(f => { const next = !f; if (next) setEditorCollapsed(true); else setEditorCollapsed(false); return next; })}
            title={fullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
            style={topBtn}
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
        <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: '0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.3rem 0.55rem', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {(['ic', 'ooc', 'notes'] as const).map(s => (
              <button key={s} onClick={() => setSearchScope(s)} style={{
                fontFamily: 'var(--mono)', fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                background: searchScope === s ? 'var(--bg-3)' : 'none',
                border: `1px solid ${searchScope === s ? 'var(--border)' : 'transparent'}`,
                color: searchScope === s ? 'var(--text)' : 'var(--text-2)',
                padding: '0.2rem 0.4rem', cursor: 'pointer',
              }}>
                {s === 'ic' ? 'IC' : s === 'ooc' ? 'OOC' : 'Notes'}
              </button>
            ))}
          </div>
          <button onClick={() => setSearchOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
        </div>
      )}

      {/* Search results */}
      {searchOpen && searchQuery && (
        <div style={{ maxHeight: '240px', overflowY: 'auto', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {searchScope === 'notes' ? (
            noteSearchResults.length === 0 ? (
              <p style={{ padding: '0.75rem 1.5rem', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--border)' }}>Не найдено</p>
            ) : (
              noteSearchResults.map(note => {
                const plain = htmlToText(note.content)
                const idx = plain.toLowerCase().indexOf(searchLower)
                const snippet = idx >= 0 ? '…' + plain.slice(Math.max(0, idx - 30), idx + 60) + '…' : plain.slice(0, 80)
                const date = new Date(note.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={note.id} style={{ padding: '0.65rem 1.5rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => { setActiveTab('notes') }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: 'var(--text-2)', marginRight: '0.5rem' }}>{date}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--text)' }}>{snippet}</span>
                  </div>
                )
              })
            )
          ) : msgSearchResults.length === 0 ? (
            <p style={{ padding: '0.75rem 1.5rem', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--border)' }}>Не найдено</p>
          ) : (
            msgSearchResults.map(msg => {
              const plain = htmlToText(msg.content)
              const idx = plain.toLowerCase().indexOf(searchLower)
              const snippet = idx >= 0 ? '…' + plain.slice(Math.max(0, idx - 30), idx + 60) + '…' : plain.slice(0, 80)
              return (
                <div key={msg.id} style={{ padding: '0.65rem 1.5rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => { setActiveTab(searchScope) }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: 'var(--text-2)', marginRight: '0.5rem' }}>{msg.nickname}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--text)' }}>{snippet}</span>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── NOTES TAB ── */}
      {isNotes ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
          {/* Notes list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {notesLoading && (
              <p style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-2)', textAlign: 'center', marginTop: '2rem' }}>Загрузка...</p>
            )}
            {!notesLoading && notes.length === 0 && (
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text-2)', textAlign: 'center', marginTop: '2rem', fontSize: '1rem' }}>
                Нет записей. Напишите первую заметку.
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
                <div key={note.id} style={{
                  border: `1px solid ${isEditing ? 'var(--accent-2)' : 'var(--border)'}`,
                  background: 'var(--bg-2)',
                }}>
                  {/* Note header */}
                  <div style={{
                    padding: '0.4rem 0.75rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-3)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                      {note.title && (
                        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {note.title}
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: 'var(--text-2)', letterSpacing: '0.06em' }}>
                        {dateStr}
                        {wasEdited && <span style={{ marginLeft: '0.5em', opacity: 0.55 }}>· изм.</span>}
                      </span>
                    </div>
                    {!isEditing && !isDeleteConfirm && (
                      <div style={{ display: 'flex', gap: '0.1rem' }}>
                        <button
                          onClick={() => { setNoteEditingId(note.id); setNoteEditTitle(note.title); setNoteEditContent(note.content) }}
                          title="Редактировать"
                          style={noteIconBtn}
                        >✎</button>
                        <button
                          onClick={() => setDeleteConfirmId(note.id)}
                          title="Удалить"
                          style={{ ...noteIconBtn, color: 'var(--border)' }}
                        >✕</button>
                      </div>
                    )}
                    {isDeleteConfirm && (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-2)' }}>Удалить?</span>
                        <button onClick={() => deleteNote(note.id)} style={{ background: '#c0392b', color: '#fff', border: 'none', fontFamily: 'var(--mono)', fontSize: '0.6rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>Да</button>
                        <button onClick={() => setDeleteConfirmId(null)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: '0.6rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>Нет</button>
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
                        placeholder="Заголовок (необязательно)"
                        style={{
                          display: 'block', width: '100%', boxSizing: 'border-box',
                          padding: '0.5rem 0.75rem', border: 'none', borderBottom: '1px solid var(--border)',
                          background: 'var(--bg-2)', color: 'var(--text)',
                          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                      <RichEditor content={noteEditContent} onChange={setNoteEditContent} minHeight="100px" />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', padding: '0.4rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                        <button onClick={() => setNoteEditingId(null)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: '0.7rem', padding: '0.3rem 0.7rem', cursor: 'pointer' }}>
                          Отмена
                        </button>
                        <button onClick={() => saveNoteEdit(note.id)} disabled={noteEditSaving} style={{ background: 'var(--accent-2)', color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.85rem', border: 'none', padding: '0.3rem 0.9rem', cursor: 'pointer' }}>
                          {noteEditSaving ? '...' : 'Сохранить'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        className="tiptap-content"
                        style={{
                          padding: '0.75rem 0.9rem',
                          maxHeight: isLong && !isExpanded ? '8em' : 'none',
                          overflow: isLong && !isExpanded ? 'hidden' : 'visible',
                          position: 'relative',
                        }}
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                      {isLong && (
                        <button
                          onClick={() => toggleNoteExpand(note.id)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'center',
                            fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.08em',
                            color: 'var(--accent-2)', background: 'none', border: 'none',
                            borderTop: '1px solid var(--border)',
                            padding: '0.35rem', cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? '↑ свернуть' : '↓ читать дальше'}
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
            <div style={{ padding: '1rem 1.5rem', textAlign: 'center', background: 'var(--bg-2)', borderTop: '1px solid var(--border)', fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text-2)', flexShrink: 0 }}>
              Вы вышли из этой игры
            </div>
          )}
          {!isLeft && <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-2)', flexShrink: 0 }}>
            {editorCollapsed ? (
              <button
                onClick={() => setEditorCollapsed(false)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '0.55rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', opacity: 0.5 }}
                title="Добавить заметку"
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
                placeholder="Заголовок (необязательно)"
                style={{
                  display: 'block', width: '100%', boxSizing: 'border-box',
                  padding: '0.5rem 0.75rem', border: 'none', borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-2)', color: 'var(--text)',
                  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <RichEditor key={newNoteKey} content={newNoteContent} onChange={setNewNoteContent} placeholder="Новая заметка..." minHeight="80px" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem' }}>
                {fullscreen && (
                  <button onClick={() => setEditorCollapsed(true)} title="Свернуть" style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                    ↓ свернуть
                  </button>
                )}
                <button
                  onClick={submitNote}
                  disabled={newNoteSending || !newNoteContent.trim() || newNoteContent === '<p></p>'}
                  style={{
                    background: 'var(--accent-2)', color: '#fff',
                    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.95rem',
                    border: 'none', padding: '0.55rem 1.5rem', cursor: 'pointer',
                    opacity: (newNoteSending || !newNoteContent.trim() || newNoteContent === '<p></p>') ? 0.6 : 1,
                  }}
                >
                  {newNoteSending ? '...' : 'Добавить →'}
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
            onClick={isOoc ? handleOocClick : undefined}
            style={{
              flex: 1, overflowY: 'auto', padding: '1.5rem',
              display: 'flex', flexDirection: 'column',
              gap: isOoc ? '0.75rem' : 'var(--game-gap, 1.5rem)',
              background: isOoc ? 'var(--bg-3)' : 'var(--bg)',
            }}
          >
            {isOoc && (
              <p style={{
                fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--text-2)', textAlign: 'center',
                padding: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem',
              }}>
                — оффтоп · вне истории —
              </p>
            )}
            {visibleMessages.length === 0 && (
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text-2)', textAlign: 'center', marginTop: '2rem' }}>
                {isOoc ? 'Оффтоп пока пуст.' : 'История пока пуста. Напишите первый пост.'}
              </p>
            )}
            <div style={!isOoc && gameLayout === 'feed' ? { maxWidth: '1050px', marginLeft: 'auto', marginRight: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--game-gap, 1.5rem)' } : { display: 'contents' }}>
            {visibleMessages.map(msg => {
              const isMine = msg.user_id === userId
              const isEditing = editingId === msg.id
              const smsOnly = isSMSOnly(msg.content)
              return isOoc
                ? (
                  <div key={msg.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--bg-2)', border: `1px solid ${isMine ? 'var(--text-2)' : 'var(--border)'}`,
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {msg.avatar_url
                        ? <img src={msg.avatar_url} alt={msg.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text-2)' }}>{msg.nickname[0]}</span>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', color: isMine ? 'var(--text)' : 'var(--text-2)', marginRight: '0.5rem' }}>
                        {msg.nickname}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--border)', letterSpacing: '0.04em' }}>
                        {new Date(msg.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {msg.edited_at && ' (ред.)'}
                      </span>
                      <div
                        className="tiptap-content"
                        style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '0.2rem', color: 'var(--text)', minHeight: 'unset' }}
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      />
                    </div>
                  </div>
                )
                : gameLayout === 'book' && !smsOnly ? (
                  /* ── BOOK: без аватарок, имя курсивом перед постом ── */
                  <div key={msg.id} style={{ maxWidth: '1550px', marginLeft: 'auto', marginRight: 'auto', width: '100%', padding: '0 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', paddingBottom: '0.35rem', marginBottom: '0.4rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: '1rem', color: 'var(--text-2)', fontStyle: 'italic' }}>
                        {msg.nickname}
                        {msg.edited_at && <span style={{ marginLeft: '0.4em', opacity: 0.5, fontSize: '0.75rem', fontStyle: 'normal', fontFamily: 'var(--mono)' }}>(ред.)</span>}
                      </span>
                      <span style={{ display: 'inline-flex', gap: '0.3rem', flexShrink: 0 }}>
                        {notesEnabled && (
                          <button onClick={() => quotePost(msg)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--serif)', fontSize: '0.85rem', padding: '0', lineHeight: 1 }}>«…»</button>
                        )}
                        {isMine && !isLeft && (
                          <button onClick={() => isEditing ? cancelEdit() : startEdit(msg)} title={isEditing ? 'Отменить' : 'Редактировать'} style={{ background: 'none', border: 'none', color: isEditing ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', padding: '0', lineHeight: 1, verticalAlign: 'middle' }}>
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z"/></svg>
                          </button>
                        )}
                      </span>
                    </div>
                    <div
                      className="tiptap-content"
                      style={{ overflowWrap: 'break-word', wordBreak: 'break-word', background: 'transparent', border: 'none', padding: '0.1rem 0' }}
                      dangerouslySetInnerHTML={{ __html: msg.content }}
                    />
                  </div>
                ) : (
                  /* ── DIALOG / FEED (+ book+sms) ── */
                  <div key={msg.id} style={{
                    display: 'flex', gap: '0.85rem',
                    flexDirection: gameLayout === 'dialog' ? (isMine ? 'row-reverse' : 'row') : 'row',
                    alignItems: 'flex-start',
                    ...(smsOnly && gameLayout !== 'feed' ? { maxWidth: '860px', marginLeft: 'auto', marginRight: 'auto', width: '100%' } : {}),
                    ...(gameLayout === 'feed' ? { background: feedPostBg(msg.user_id), padding: '0.75rem 1rem' } : {}),
                  }}>
                    {/* Avatar */}
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: 'var(--bg-3)', border: `2px solid ${isMine ? 'var(--accent)' : 'var(--border)'}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {msg.avatar_url ? <img src={msg.avatar_url} alt={msg.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'var(--serif)', fontSize: '0.85rem', color: 'var(--text-2)' }}>{msg.nickname[0]}</span>}
                    </div>
                    <div style={{ maxWidth: gameLayout === 'feed' ? '100%' : '72%', minWidth: 0, flex: 1 }}>
                      {smsOnly ? (
                        <>
                          <p style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: '0.08em', color: isMine ? 'var(--accent)' : 'var(--text-2)', marginBottom: '0.2rem', textAlign: gameLayout === 'dialog' && isMine ? 'right' : 'left', fontWeight: 600 }}>
                            {msg.nickname}
                            {isMine && !isLeft && (
                              <button onClick={() => isEditing ? cancelEdit() : startEdit(msg)} title={isEditing ? 'Отменить' : 'Редактировать'} style={{ marginLeft: '0.5em', background: 'none', border: 'none', color: isEditing ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', padding: '0', lineHeight: 1, verticalAlign: 'middle' }}>
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z"/></svg>
                              </button>
                            )}
                          </p>
                          <div
                            className={`tiptap-content${isMine && gameLayout === 'dialog' ? ' sms-right' : ''}`}
                            style={{ overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0, background: 'transparent', border: 'none', padding: '0' }}
                            dangerouslySetInnerHTML={{ __html: msg.content }}
                          />
                        </>
                      ) : (
                        <>
                          <p style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--text-2)', marginBottom: '0.3rem', textAlign: gameLayout === 'dialog' && isMine ? 'right' : 'left' }}>
                            {msg.nickname}
                            {msg.edited_at && <span style={{ marginLeft: '0.4em', opacity: 0.6 }}>(ред.)</span>}
                            {notesEnabled && (
                              <button onClick={() => quotePost(msg)} style={{ marginLeft: '0.5em', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--serif)', fontSize: '0.85rem', padding: '0', lineHeight: 1 }}>«…»</button>
                            )}
                            {isMine && !isLeft && (
                              <button onClick={() => isEditing ? cancelEdit() : startEdit(msg)} title={isEditing ? 'Отменить' : 'Редактировать'} style={{ marginLeft: '0.5em', background: 'none', border: 'none', color: isEditing ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', padding: '0', lineHeight: 1, verticalAlign: 'middle' }}>
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z"/></svg>
                              </button>
                            )}
                          </p>
                          <div
                            className="tiptap-content"
                            style={{
                              overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0,
                              ...(gameLayout === 'feed' ? {
                                background: 'transparent', border: 'none', padding: '0',
                              } : {
                                background: isMine ? 'var(--post-mine-bg)' : 'transparent',
                                borderTop: 'none', borderBottom: 'none',
                                borderLeft: isMine ? 'none' : `2px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}`,
                                borderRight: isMine ? `2px solid ${isEditing ? 'var(--accent)' : 'var(--post-mine-stripe)'}` : 'none',
                                padding: '0.75rem 1.25rem', borderRadius: 0,
                              }),
                            }}
                            dangerouslySetInnerHTML={{ __html: msg.content }}
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

          {/* Input */}
          {!isLeft && (
            <div style={{
              borderTop: `1px solid ${editingId && !isOoc ? 'var(--accent)' : isOoc ? 'var(--text-2)' : 'var(--border)'}`,
              background: isOoc ? 'var(--bg-3)' : 'var(--bg-2)',
              flexShrink: 0,
            }}>
            {editorCollapsed && !editingId ? (
              <button
                onClick={() => setEditorCollapsed(false)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '0.55rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', opacity: 0.5 }}
                title="Написать пост"
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
              {editingId && !isOoc && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.75rem', background: 'var(--accent-dim)', borderBottom: '1px solid var(--accent)' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', color: 'var(--text-2)', letterSpacing: '0.06em' }}>
                    редактирование поста
                  </span>
                  <button onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '0.62rem', padding: '0' }}>
                    отмена
                  </button>
                </div>
              )}
              {isOoc
                ? <OocEditor key={oocSendKey} content={oocContent} onChange={setOocContent} placeholder="Написать в оффтоп..." />
                : <RichEditor key={sendKey} content={content} onChange={setContent} placeholder="Напиши свой пост..." minHeight="100px" onDiceClick={!editingId ? () => setShowDicePanel(v => !v) : undefined} diceActive={showDicePanel} />
              }
              {showDicePanel && !editingId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: 'var(--bg-2)', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--text-2)', letterSpacing: '0.08em' }}>d</span>
                  <input
                    type="number" min={2} max={100} value={diceSides}
                    onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 0 && Number(v) <= 100)) setDiceSides(v) }}
                    onKeyDown={e => { if (e.key === 'Enter') rollDice() }}
                    style={{ width: '3.5rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.2rem 0.4rem', textAlign: 'center' }}
                  />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--border)', letterSpacing: '0.04em' }}>2–100</span>
                  <button
                    onClick={rollDice} disabled={diceRolling || isNaN(parseInt(diceSides)) || parseInt(diceSides) < 2 || parseInt(diceSides) > 100}
                    style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.85rem', border: 'none', padding: '0.25rem 0.9rem', cursor: 'pointer', opacity: (diceRolling || isNaN(parseInt(diceSides)) || parseInt(diceSides) < 2 || parseInt(diceSides) > 100) ? 0.4 : 1 }}
                  >
                    {diceRolling ? '...' : 'Бросить'}
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: fullscreen && !editingId ? 'space-between' : 'flex-end', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem' }}>
                {fullscreen && !editingId && (
                  <button onClick={() => setEditorCollapsed(true)} title="Свернуть редактор" style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '0.75rem', padding: '0.2rem 0.5rem', lineHeight: 1 }}>
                    ↓ свернуть
                  </button>
                )}
                <button
                  onClick={editingId && !isOoc ? saveEdit : send}
                  disabled={editSaving || sending || !(isOoc ? oocContent : content).trim()}
                  style={{
                    background: isOoc ? 'var(--text-2)' : 'var(--accent)',
                    color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.95rem',
                    border: 'none', padding: '0.55rem 1.5rem', cursor: 'pointer',
                    opacity: (!(isOoc ? oocContent : content).trim() || sending || editSaving) ? 0.6 : 1,
                  }}
                >
                  {(sending || editSaving) ? '...' : editingId && !isOoc ? 'Сохранить' : isOoc ? 'Отправить' : 'Отправить →'}
                </button>
              </div>
              </>
            )}
            </div>
          )}
          {isLeft && (
            <div style={{ padding: '1rem 1.5rem', textAlign: 'center', background: 'var(--bg-2)', borderTop: '1px solid var(--border)', fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text-2)' }}>
              Вы вышли из этой игры
            </div>
          )}
        </>
      )}

      {/* Quote toast */}
      {quoteToast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--bg)',
          fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.08em',
          padding: '0.5rem 1.1rem', zIndex: 600, pointerEvents: 'none',
        }}>
          Добавлено в заметки
        </div>
      )}

      {/* Dice popup */}
      {diceQueue.length > 0 && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDiceQueue(q => q.slice(1))}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '2rem 3rem', textAlign: 'center', minWidth: '200px', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}
          >
            <p style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-2)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              {diceQueue[0].roller} · d{diceQueue[0].sides}
              {diceQueue.length > 1 && <span style={{ marginLeft: '0.75em', opacity: 0.5 }}>+{diceQueue.length - 1}</span>}
            </p>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '4rem', color: 'var(--accent)', fontStyle: 'italic', lineHeight: 1, marginBottom: '1.5rem' }}>
              {diceQueue[0].result}
            </p>
            <button
              onClick={() => setDiceQueue(q => q.slice(1))}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: '0.65rem', letterSpacing: '0.1em', padding: '0.35rem 1.25rem', cursor: 'pointer' }}
            >
              {diceQueue.length > 1 ? 'следующий' : 'закрыть'}
            </button>
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExport && (
        <Modal onClose={() => setShowExport(false)} title="Экспорт">
          <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif-body)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            История игры
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button onClick={exportTxt} style={exportBtn}>
              .txt<br/><span style={exportSub}>Чистый текст</span>
            </button>
            <button onClick={exportHtml} style={exportBtn}>
              .html<br/><span style={exportSub}>С форматированием</span>
            </button>
          </div>
          {notesEnabled && notes.length > 0 && (
            <>
              <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif-body)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Мои заметки
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={exportNotesTxt} style={exportBtn}>
                  .txt<br/><span style={exportSub}>Чистый текст</span>
                </button>
                <button onClick={exportNotesHtml} style={exportBtn}>
                  .html<br/><span style={exportSub}>С форматированием</span>
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Leave modal */}
      {showLeave && (
        <Modal onClose={() => setShowLeave(false)} title="Выйти из игры">
          <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif-body)', marginBottom: '1.25rem' }}>
            Выберите причину выхода. Соигрок увидит её.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {LEAVE_REASONS.map(r => (
              <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontFamily: 'var(--serif-body)', color: leaveReason === r ? 'var(--accent)' : 'var(--text)' }}>
                <input type="radio" value={r} checked={leaveReason === r} onChange={() => setLeaveReason(r)} style={{ accentColor: 'var(--accent)' }} />
                {r}
              </label>
            ))}
          </div>
          <button onClick={leave} style={{ background: '#c0392b', color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', border: 'none', padding: '0.6rem 1.4rem', cursor: 'pointer' }}>
            Выйти →
          </button>
        </Modal>
      )}

      {/* Report modal */}
      {showReport && (
        <Modal onClose={() => setShowReport(false)} title="Пожаловаться">
          <textarea
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            placeholder="Опишите ситуацию..."
            rows={4}
            style={{ width: '100%', fontFamily: 'var(--serif-body)', fontSize: '1rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.65rem', outline: 'none', resize: 'vertical', marginBottom: '1rem' }}
          />
          <button onClick={report} style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', border: 'none', padding: '0.6rem 1.4rem', cursor: 'pointer' }}>
            Отправить жалобу
          </button>
        </Modal>
      )}

      {/* Settings modal */}
      {showSettings && (
        <Modal onClose={() => setShowSettings(false)} title="Настройки игры">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={fieldLabel}>Твой никнейм в этой игре</span>
              <input value={nickname} onChange={e => setNickname(e.target.value)} style={settingInput} maxLength={50} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={fieldLabel}>URL аватара персонажа</span>
              <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} style={settingInput} placeholder="https://..." maxLength={512} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={fieldLabel}>URL баннера игры</span>
              <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} style={settingInput} placeholder="https://..." maxLength={512} />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={fieldLabel}>Отображение баннера</span>
              {([['own', 'Мой баннер'], ['partner', 'Баннер соигрока'], ['none', 'Без баннера']] as const).map(([val, label]) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="banner_pref"
                    checked={bannerPref === val}
                    onChange={() => setBannerPref(val)}
                    style={{ accentColor: 'var(--text-2)', width: '14px', height: '14px', flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: 'var(--serif-body)', fontSize: '0.9rem', color: 'var(--text)' }}>{label}</span>
                </label>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={oocEnabled}
                onChange={e => setOocEnabled(e.target.checked)}
                style={{ accentColor: 'var(--text-2)', width: '16px', height: '16px', marginTop: '0.15rem', flexShrink: 0 }}
              />
              <div>
                <span style={fieldLabel}>Включить вкладку «Оффтоп»</span>
                <p style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-2)', marginTop: '0.2rem' }}>
                  Для обсуждений вне истории
                </p>
              </div>
            </label>
            <button onClick={saveSettings} style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', border: 'none', padding: '0.6rem 1.4rem', cursor: 'pointer', alignSelf: 'flex-start' }}>
              Сохранить →
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function tabBtnStyle(isActive: boolean, tab: 'ic' | 'ooc' | 'notes'): React.CSSProperties {
  const color = tab === 'ic' ? '#7d2c3e' : 'var(--text-2)'
  return {
    fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '0.3rem 0.7rem',
    background: 'none', border: 'none', cursor: 'pointer',
    color: isActive ? color : 'var(--border)',
    borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  }
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '2rem', maxWidth: '480px', width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontStyle: 'italic', color: 'var(--text)', marginBottom: '1.25rem' }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

const topBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-2)',
  padding: '0.3rem 0.4rem', cursor: 'pointer', lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const fieldLabel: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-2)',
}

const settingInput: React.CSSProperties = {
  background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)',
  fontFamily: 'var(--serif-body)', fontSize: '1rem', padding: '0.55rem 0.8rem', outline: 'none',
}

const exportBtn: React.CSSProperties = {
  flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)',
  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1rem', padding: '0.75rem',
  cursor: 'pointer', textAlign: 'center',
}

const exportSub: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text-2)', fontStyle: 'normal', display: 'block',
}

const noteIconBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-2)',
  cursor: 'pointer', fontSize: '0.78rem', padding: '0.1rem 0.25rem', lineHeight: 1,
}
