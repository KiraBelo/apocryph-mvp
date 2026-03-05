'use client'
import { useState } from 'react'
import Link from 'next/link'

export interface MyRequest {
  id: string; title: string; body: string | null; type: string; content_level: string; tags: string[]
  status: string; is_public: boolean; created_at: string
}

const statusLabel: Record<string, string> = { draft: 'Черновики', active: 'В ленте', inactive: 'Неактивные' }
const statusColor: Record<string, string> = { draft: 'var(--text-2)', active: 'var(--accent)', inactive: 'var(--border)' }

export default function MyRequestsClient({ requests: initial, initialTab = 'active' }: { requests: MyRequest[], initialTab?: 'all' | 'active' | 'draft' | 'inactive' }) {
  const [requests, setRequests] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'inactive'>(initialTab)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)

  async function copyInvite(id: string) {
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: id }),
    })
    const { token } = await res.json()
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered: MyRequest[] = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  async function changeStatus(id: string, status: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  async function deleteRequest(id: string) {
    setRequests(prev => prev.filter(r => r.id !== id))
    setConfirmDelete(null)
    fetch(`/api/requests/${id}`, { method: 'DELETE' })
  }

  return (
    <div>
      {/* Tab filter */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        {(['active', 'inactive', 'draft', 'all'] as const).map(f => {
          const count = f === 'all' ? requests.length : requests.filter(r => r.status === f).length
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', borderBottom: filter === f ? '2px solid var(--accent)' : '2px solid transparent', color: filter === f ? 'var(--accent)' : 'var(--text-2)', padding: '0.6rem 1rem', cursor: 'pointer', marginBottom: '-1px' }}>
              {f === 'all' ? 'Все заявки' : statusLabel[f]}
              {' '}
              <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Заявок нет.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)' }}>
        {filtered.map(r => {
          const plainText = (r.body ?? '').replace(/<[^>]+>/g, '')
          const isLong = plainText.length > 1000
          const exp = expanded.has(r.id)
          return (
            <div key={r.id} style={{ background: 'var(--bg)', padding: '1.25rem 1.5rem', position: 'relative' }}>

              {/* Иконки редактирования и удаления — правый верхний угол */}
              <div style={{ position: 'absolute', top: '0.7rem', right: '1rem', display: 'flex', gap: '0.1rem', alignItems: 'center' }}>
                <button onClick={() => copyInvite(r.id)} title="Скопировать инвайт-ссылку" style={{ background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '0.72rem', color: copied === r.id ? 'var(--accent)' : 'var(--text-2)', padding: '0.2rem 0.3rem', lineHeight: 1, cursor: 'pointer', opacity: copied === r.id ? 1 : 0.5, transition: 'color 0.15s, opacity 0.15s' }}
                  onMouseEnter={e => { if (copied !== r.id) { e.currentTarget.style.opacity = '1' } }}
                  onMouseLeave={e => { if (copied !== r.id) { e.currentTarget.style.opacity = '0.5' } }}
                >{copied === r.id ? '✓' : '🔗'}</button>
                <Link href={`/requests/${r.id}/edit`} title="Редактировать" style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem', color: 'var(--text-2)', padding: '0.2rem 0.3rem', lineHeight: 1, opacity: 0.5, textDecoration: 'none', display: 'inline-block', transform: 'scaleX(-1)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.5'}
                >✎</Link>
                <button onClick={() => setConfirmDelete(r.id)} title="Удалить" style={{ background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-2)', padding: '0.2rem 0.3rem', lineHeight: 1, cursor: 'pointer', opacity: 0.5 }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-2)' }}
                >✕</button>
              </div>

              {/* Подтверждение удаления */}
              {confirmDelete === r.id && (
                <div style={{ position: 'absolute', top: '0.5rem', right: '4rem', zIndex: 10, background: 'var(--bg)', border: '1px solid var(--accent)', padding: '0.6rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.08em', color: 'var(--text)' }}>
                    Удалить заявку?
                  </span>
                  <button onClick={() => deleteRequest(r.id)} style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.08em', background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
                    Да
                  </button>
                  <button onClick={() => setConfirmDelete(null)} style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
                    Нет
                  </button>
                </div>
              )}

              {/* Основной ряд: кнопка + заголовок + теги */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {r.status === 'active'
                  ? <button onClick={() => changeStatus(r.id, 'inactive')} title="Снять с ленты" style={iconActionBtn}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--text-2)' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >⏸</button>
                  : <button onClick={() => changeStatus(r.id, 'active')} title="Опубликовать в ленту" style={{ ...iconActionBtn, color: 'var(--accent)', borderColor: 'var(--accent-dim)' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.borderColor = 'var(--accent-dim)' }}
                    >▶</button>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', paddingRight: '3.5rem' }}>
                    <Link href={`/requests/${r.id}`}
                      style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--text)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {r.title}
                    </Link>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: statusColor[r.status] }}>
                      {statusLabel[r.status]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {r.tags.slice(0, 4).map(t => (
                      <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-2)' }}>#{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Превью текста */}
              {r.body && (
                <div style={{ marginTop: '0.75rem', paddingLeft: '2.75rem' }}>
                  <div style={{ position: 'relative' }}>
                    {!isLong || exp ? (
                      <div
                        style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.65, overflowWrap: 'break-word', wordBreak: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: r.body }}
                      />
                    ) : (
                      <>
                        <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                          {plainText.slice(0, 1000)}
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2.5rem', background: 'linear-gradient(to bottom, transparent, var(--bg))', pointerEvents: 'none' }} />
                      </>
                    )}
                  </div>
                  {isLong && (
                    <button
                      onClick={() => setExpanded(prev => {
                        const next = new Set(prev)
                        exp ? next.delete(r.id) : next.add(r.id)
                        return next
                      })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0 0', fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block' }}
                    >
                      {exp ? 'Свернуть ↑' : 'Читать дальше →'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const iconActionBtn: React.CSSProperties = {
  background: 'none',
  border: '1.5px solid var(--border)',
  borderRadius: '50%',
  width: '2rem',
  height: '2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-2)',
  fontSize: '0.7rem',
  cursor: 'pointer',
  flexShrink: 0,
  opacity: 0.7,
  transition: 'opacity 0.15s, border-color 0.15s',
  padding: 0,
}
