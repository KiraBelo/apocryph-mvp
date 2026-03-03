'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import RichEditor from './RichEditor'
import Link from 'next/link'

interface Message {
  id: string; participant_id: string; content: string; created_at: string;
  edited_at: string | null; nickname: string; avatar_url: string | null; user_id: string
}

interface Participant {
  id: string; user_id: string; nickname: string; avatar_url: string | null; left_at: string | null
}

interface Props {
  gameId: string
  game: { id: string; request_id: string | null; banner_url: string | null }
  initialMessages: Message[]
  participants: Participant[]
  me: Participant
  userId: string
  requestTitle: string | null
}

const LEAVE_REASONS = ['Нет времени', 'Сменились интересы', 'Неподходящий партнёр', 'История завершена', 'Другое']

export default function GameDialogClient({ gameId, game, initialMessages, participants, me, userId, requestTitle }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')
  const [reportReason, setReportReason] = useState('')
  const [nickname, setNickname] = useState(me.nickname)
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(game.banner_url ?? '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isLeft = !!me.left_at

  // SSE
  useEffect(() => {
    if (isLeft) return
    const es = new EventSource(`/api/games/${gameId}/messages/stream`)
    es.onmessage = e => {
      const data = JSON.parse(e.data)
      if (data._type === 'edit') {
        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, content: data.content, edited_at: data.edited_at } : m))
      } else {
        const { _type: _, ...msg } = data
        setMessages(prev => [...prev, msg as Message])
      }
    }
    return () => es.close()
  }, [gameId, isLeft])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!content.trim() || sending) return
    setSending(true)
    await fetch(`/api/games/${gameId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setContent('')
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

  function htmlToText(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent ?? div.innerText ?? ''
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function exportTxt() {
    const title = requestTitle ?? 'История'
    const lines = [`${title}\n${'='.repeat(title.length)}\n`]
    for (const msg of messages) {
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
    const rows = messages.map(msg => {
      const date = new Date(msg.created_at).toLocaleString('ru')
      return `<div class="msg">
  <div class="meta">${msg.nickname}${msg.edited_at ? ' <span class="edited">(ред.)</span>' : ''} · <span class="date">${date}</span></div>
  <div class="body">${msg.content}</div>
</div>`
    }).join('\n')

    const html = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 3rem auto; padding: 0 1.5rem; color: #1c1813; background: #f7f3eb; line-height: 1.7; }
  h1 { font-size: 2rem; font-style: italic; font-weight: 300; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 2rem; }
  .msg { margin-bottom: 2rem; }
  .meta { font-family: monospace; font-size: 0.75rem; letter-spacing: 0.05em; color: #666; margin-bottom: 0.4rem; }
  .edited { opacity: 0.6; }
  .date { opacity: 0.7; }
  .body { background: #fff; border: 1px solid #ddd; padding: 1rem 1.25rem; }
  p { margin: 0 0 0.75em; } p:last-child { margin-bottom: 0; }
</style>
</head>
<body>
<h1>${title}</h1>
${rows}
</body></html>`

    downloadFile(html, `${title}.html`, 'text/html;charset=utf-8')
    setShowExport(false)
  }

  function startEdit(msg: Message) {
    setEditingId(msg.id)
    setEditContent(msg.content)
  }

  async function saveEdit() {
    if (!editingId || editSaving) return
    setEditSaving(true)
    const res = await fetch(`/api/games/${gameId}/messages/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMessages(prev => prev.map(m => m.id === editingId ? { ...m, content: updated.content, edited_at: updated.edited_at } : m))
      setEditingId(null)
    }
    setEditSaving(false)
  }

  async function saveSettings() {
    await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banner_url: bannerUrl, nickname, avatar_url: avatarUrl }),
    })
    setShowSettings(false)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: 'var(--bg)' }}>
      {/* Banner */}
      {(game.banner_url || bannerUrl) && (
        <div style={{ height: '180px', background: `url(${game.banner_url || bannerUrl}) center/cover`, flexShrink: 0 }} />
      )}

      {/* Top bar */}
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--bg-2)' }}>
        <div>
          <Link href="/my/games" style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)' }}>← Мои игры</Link>
          {requestTitle && <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1rem', color: 'var(--text)', marginTop: '0.15rem' }}>{requestTitle}</p>}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Participants */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {participants.filter(p => !p.left_at).map(p => (
              <div key={p.id} title={p.nickname} style={{
                width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden',
                border: `2px solid ${p.user_id === userId ? 'var(--accent)' : 'var(--border)'}`,
                background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {p.avatar_url
                  ? <img src={p.avatar_url} alt={p.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: 'var(--serif)', fontSize: '0.8rem', color: 'var(--text-2)' }}>{p.nickname[0]}</span>
                }
              </div>
            ))}
          </div>

          <button onClick={() => setShowExport(true)} style={topBtn} title="Экспорт">⬇ Экспорт</button>
          {!isLeft && (
            <>
              <button onClick={() => setShowSettings(true)} style={topBtn} title="Настройки">⚙</button>
              <button onClick={() => setShowReport(true)} style={topBtn} title="Пожаловаться">⚑</button>
              <button onClick={() => setShowLeave(true)} style={{ ...topBtn, color: '#c0392b' }} title="Выйти из игры">← Выйти</button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 'var(--game-gap, 1.5rem)' }}>
        {messages.length === 0 && (
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text-2)', textAlign: 'center', marginTop: '2rem' }}>
            История пока пуста. Напишите первый пост.
          </p>
        )}
        {messages.map(msg => {
          const isMine = msg.user_id === userId
          const isEditing = editingId === msg.id
          return (
            <div key={msg.id} style={{ display: 'flex', gap: '0.85rem', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: 'var(--bg-3)', border: `2px solid ${isMine ? 'var(--accent)' : 'var(--border)'}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {msg.avatar_url
                  ? <img src={msg.avatar_url} alt={msg.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: 'var(--serif)', fontSize: '0.85rem', color: 'var(--text-2)' }}>{msg.nickname[0]}</span>
                }
              </div>
              {/* Bubble */}
              <div style={{ maxWidth: '72%' }}>
                <p style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--text-2)', marginBottom: '0.3rem', textAlign: isMine ? 'right' : 'left' }}>
                  {msg.nickname}
                  {msg.edited_at && <span style={{ marginLeft: '0.4em', opacity: 0.6 }}>(ред.)</span>}
                </p>
                {isEditing ? (
                  <div style={{ border: '1px solid var(--accent)', background: 'var(--bg-2)' }}>
                    <RichEditor content={editContent} onChange={setEditContent} minHeight="80px" />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', padding: '0.4rem 0.75rem' }}>
                      <button onClick={() => setEditingId(null)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: '0.7rem', padding: '0.3rem 0.7rem', cursor: 'pointer' }}>
                        Отмена
                      </button>
                      <button onClick={saveEdit} disabled={editSaving} style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.85rem', border: 'none', padding: '0.3rem 0.9rem', cursor: 'pointer' }}>
                        {editSaving ? '...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="tiptap-content"
                    title={isMine && !isLeft ? 'Двойной клик для редактирования' : undefined}
                    onDoubleClick={isMine && !isLeft ? () => startEdit(msg) : undefined}
                    style={{
                      background: isMine ? 'var(--accent-dim)' : 'var(--bg-2)',
                      border: `1px solid ${isMine ? 'var(--accent-dim)' : 'var(--border)'}`,
                      padding: '1rem 1.25rem',
                      borderRadius: isMine ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                      cursor: isMine && !isLeft ? 'default' : undefined,
                    }}
                    dangerouslySetInnerHTML={{ __html: msg.content }}
                  />
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isLeft && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-2)', flexShrink: 0 }}>
          <RichEditor content={content} onChange={setContent} placeholder="Напиши свой пост..." minHeight="100px" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 0.75rem' }}>
            <button onClick={send} disabled={sending || !content.trim()}
              style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.95rem', border: 'none', padding: '0.55rem 1.5rem', cursor: 'pointer', opacity: (!content.trim() || sending) ? 0.6 : 1 }}>
              {sending ? '...' : 'Отправить →'}
            </button>
          </div>
        </div>
      )}
      {isLeft && (
        <div style={{ padding: '1rem 1.5rem', textAlign: 'center', background: 'var(--bg-2)', borderTop: '1px solid var(--border)', fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text-2)' }}>
          Вы вышли из этой игры
        </div>
      )}

      {/* Export modal */}
      {showExport && (
        <Modal onClose={() => setShowExport(false)} title="Экспорт истории">
          <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif-body)', marginBottom: '1.5rem' }}>
            Сохранить всю историю переписки в файл.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={exportTxt}
              style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1rem', padding: '0.75rem', cursor: 'pointer', textAlign: 'center' }}>
              .txt<br/>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text-2)', fontStyle: 'normal' }}>Чистый текст</span>
            </button>
            <button onClick={exportHtml}
              style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1rem', padding: '0.75rem', cursor: 'pointer', textAlign: 'center' }}>
              .html<br/>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text-2)', fontStyle: 'normal' }}>С форматированием</span>
            </button>
          </div>
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
              <input value={nickname} onChange={e => setNickname(e.target.value)} style={settingInput} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={fieldLabel}>URL аватара персонажа</span>
              <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} style={settingInput} placeholder="https://..." />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={fieldLabel}>URL баннера игры</span>
              <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} style={settingInput} placeholder="https://..." />
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

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '2rem', maxWidth: '480px', width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontStyle: 'italic', color: 'var(--text)', marginBottom: '1.25rem' }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

const topBtn: React.CSSProperties = {
  background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)',
  fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.08em',
  padding: '0.3rem 0.6rem', cursor: 'pointer',
}

const fieldLabel: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-2)',
}

const settingInput: React.CSSProperties = {
  background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)',
  fontFamily: 'var(--serif-body)', fontSize: '1rem', padding: '0.55rem 0.8rem', outline: 'none',
}
