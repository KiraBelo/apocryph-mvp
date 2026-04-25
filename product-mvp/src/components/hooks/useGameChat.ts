import { useState, useRef, useEffect } from 'react'
import type { Message } from '../game/types'
import type { ToastType } from '../ToastProvider'
import { safeJson } from '@/lib/fetch-utils'

export function useGameChat({ gameId, participantId, activeTab, t, onMyConsentReset, addToast }: {
  gameId: string
  participantId: string
  activeTab: 'ic' | 'ooc' | 'notes' | 'prepare'
  t: (key: string) => unknown
  onMyConsentReset?: () => void
  addToast: (msg: string, type?: ToastType) => void
}, initial: {
  messages: Message[]
  page: number
  totalPages: number
}) {
  const [icMessages, setIcMessages] = useState<Message[]>(initial.messages)
  const [icPage, setIcPage] = useState(initial.page)
  const [icTotalPages, setIcTotalPages] = useState(initial.totalPages)
  const [oocMessages, setOocMessages] = useState<Message[]>([])
  const [oocPage, setOocPage] = useState(1)
  const [oocTotalPages, setOocTotalPages] = useState(1)
  const [oocLoaded, setOocLoaded] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)
  const [content, setContent] = useState('')
  const [oocContent, setOocContent] = useState('')
  const [sending, setSending] = useState(false)
  const [sendKey, setSendKey] = useState(0)
  const [oocSendKey, setOocSendKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [scrollToMsgId, setScrollToMsgId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Draft auto-save
  const draftKey = (type: 'ic' | 'ooc') => `apocryph_draft_${gameId}_${type}`

  // Restore drafts on mount (only if not editing)
  useEffect(() => {
    const icDraft = localStorage.getItem(draftKey('ic'))
    const oocDraft = localStorage.getItem(draftKey('ooc'))
    if (icDraft) setContent(icDraft)
    if (oocDraft) setOocContent(oocDraft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  // Auto-save every 30 seconds, pause when tab is hidden
  const draftIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const contentRef = useRef(content)
  const oocContentRef = useRef(oocContent)
  contentRef.current = content
  oocContentRef.current = oocContent

  useEffect(() => {
    const saveDrafts = () => {
      const icDraft = contentRef.current.trim()
      const oocDraft = oocContentRef.current.trim()
      if (icDraft) localStorage.setItem(draftKey('ic'), icDraft)
      else localStorage.removeItem(draftKey('ic'))
      if (oocDraft) localStorage.setItem(draftKey('ooc'), oocDraft)
      else localStorage.removeItem(draftKey('ooc'))
    }

    const startInterval = () => {
      if (draftIntervalRef.current) clearInterval(draftIntervalRef.current)
      draftIntervalRef.current = setInterval(saveDrafts, 30000)
    }

    const handleVisibility = () => {
      if (document.hidden) {
        if (draftIntervalRef.current) { clearInterval(draftIntervalRef.current); draftIntervalRef.current = null }
      } else {
        startInterval()
      }
    }

    startInterval()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (draftIntervalRef.current) clearInterval(draftIntervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [gameId])

  // Save on beforeunload
  useEffect(() => {
    function saveDrafts() {
      if (content.trim()) localStorage.setItem(draftKey('ic'), content)
      else localStorage.removeItem(draftKey('ic'))
      if (oocContent.trim()) localStorage.setItem(draftKey('ooc'), oocContent)
      else localStorage.removeItem(draftKey('ooc'))
    }
    window.addEventListener('beforeunload', saveDrafts)
    return () => window.removeEventListener('beforeunload', saveDrafts)
  }, [content, oocContent, gameId])

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
      if (!res.ok) {
        const data = await safeJson(res)
        addToast(data.error === 'stopListBlocked'
          ? t('errors.stopListBlocked') as string
          : t('errors.sendingMessage') as string, 'error')
        return
      }
      if (activeTab === 'ooc') { setOocContent(''); setOocSendKey(k => k + 1); localStorage.removeItem(draftKey('ooc')) }
      else { setContent(''); setSendKey(k => k + 1); localStorage.removeItem(draftKey('ic')) }
    } catch { addToast(t('errors.networkError') as string, 'error') }
    finally { setSending(false) }
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
    try {
      const res = await fetch(`/api/games/${gameId}/messages/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) { const d = await safeJson(res); addToast(t(`errors.${d.error}`) as string || t('errors.networkError') as string, 'error'); return }
      const updated = await res.json()
      const updater = (prev: Message[]) => prev.map(m => m.id === editingId ? { ...m, content: updated.content, edited_at: updated.edited_at } : m)
      setIcMessages(updater)
      setOocMessages(updater)
      onMyConsentReset?.()
      cancelEdit()
    } catch { addToast(t('errors.networkError') as string, 'error') }
    finally { setEditSaving(false) }
  }

  async function goToPage(type: 'ic' | 'ooc', page: number) {
    setPageLoading(true)
    try {
      const pageLimit = type === 'ooc' ? 100 : 30
      const res = await fetch(`/api/games/${gameId}/messages?type=${type}&page=${page}&limit=${pageLimit}`)
      if (!res.ok) { const d = await safeJson(res); addToast(t(`errors.${d.error}`) as string || t('errors.networkError') as string, 'error'); return }
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
    } catch { addToast(t('errors.networkError') as string, 'error') }
    finally {
      setPageLoading(false)
    }
  }

  function loadOocHistory() {
    if (oocLoaded) return
    setPageLoading(true)
    fetch(`/api/games/${gameId}/messages?type=ooc&limit=100`)
      .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.json() })
      .then(data => {
        setOocMessages(data.messages)
        setOocPage(data.page)
        setOocTotalPages(data.totalPages)
        setOocLoaded(true)
      })
      .catch(() => { addToast(t('errors.networkError') as string, 'error') })
      .finally(() => setPageLoading(false))
  }

  function appendIcMessage(msg: Message) {
    setIcMessages(prev => [...prev, msg])
  }

  function appendOocMessage(msg: Message) {
    setOocMessages(prev => [...prev, msg])
  }

  function updateMessage(data: { id: string; content: string; edited_at: string }) {
    const updater = (prev: Message[]) => prev.map(m => m.id === data.id ? { ...m, content: data.content, edited_at: data.edited_at } : m)
    setIcMessages(updater)
    setOocMessages(updater)
  }

  // Updates messages authored by the given participant. We use participant_id
  // (per-game opaque) rather than user_id — see CRIT-1 in audit-v4.
  function updateLocalNickname(targetParticipantId: string, nickname: string, avatarUrl: string | null) {
    const updater = (prev: Message[]) => prev.map(m =>
      m.participant_id === targetParticipantId
        ? { ...m, avatar_url: avatarUrl, nickname }
        : m
    )
    setIcMessages(updater)
    setOocMessages(updater)
  }

  return {
    icMessages, oocMessages,
    icPage, icTotalPages, oocPage, oocTotalPages,
    oocLoaded, pageLoading,
    content, setContent, oocContent, setOocContent,
    sending, sendKey, oocSendKey,
    editingId, editSaving,
    scrollToMsgId, setScrollToMsgId,
    scrollRef,
    send, startEdit, cancelEdit, saveEdit, goToPage,
    loadOocHistory, appendIcMessage, appendOocMessage,
    updateMessage, updateLocalNickname,
  }
}
