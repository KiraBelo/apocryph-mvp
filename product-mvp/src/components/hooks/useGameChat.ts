import { useState, useRef } from 'react'
import type { Message } from '../game/types'

export function useGameChat({ gameId, participantId, activeTab, t }: {
  gameId: string
  participantId: string
  activeTab: 'ic' | 'ooc' | 'notes'
  t: (key: string) => unknown
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
        const data = await res.json().catch(() => ({}))
        alert(data.error === 'stopListBlocked'
          ? t('errors.stopListBlocked') as string
          : t('errors.sendingMessage') as string)
        return
      }
      if (activeTab === 'ooc') { setOocContent(''); setOocSendKey(k => k + 1) }
      else { setContent(''); setSendKey(k => k + 1) }
    } catch { alert(t('errors.networkError') as string) }
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
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(t(`errors.${d.error}`) as string || t('errors.networkError') as string); return }
      const updated = await res.json()
      const updater = (prev: Message[]) => prev.map(m => m.id === editingId ? { ...m, content: updated.content, edited_at: updated.edited_at } : m)
      setIcMessages(updater)
      setOocMessages(updater)
      cancelEdit()
    } catch { alert(t('errors.networkError') as string) }
    finally { setEditSaving(false) }
  }

  async function goToPage(type: 'ic' | 'ooc', page: number) {
    setPageLoading(true)
    try {
      const pageLimit = type === 'ooc' ? 100 : 30
      const res = await fetch(`/api/games/${gameId}/messages?type=${type}&page=${page}&limit=${pageLimit}`)
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(t(`errors.${d.error}`) as string || t('errors.networkError') as string); return }
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
    } catch { alert(t('errors.networkError') as string) }
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
      .catch(() => { alert(t('errors.networkError') as string) })
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

  function updateLocalNickname(userId: string, nickname: string, avatarUrl: string | null) {
    const updater = (prev: Message[]) => prev.map(m =>
      m.user_id === userId
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
