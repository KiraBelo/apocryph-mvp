'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const contentLabels: Record<string, string> = { none: 'без постельных сцен', rare: 'редко', often: 'часто', core: 'основа сюжета', flexible: 'по договорённости' }
const typeLabels: Record<string, string> = { duo: 'На двоих', multiplayer: 'Мультиплеер' }
const fandomTypeLabels: Record<string, string> = { fandom: 'Фандом', original: 'Оридж' }
const pairingLabels: Record<string, string> = { sl: 'M/M', fm: 'F/F', gt: 'M/F', any: 'Любой пейринг', multi: 'Мульти', other: 'Другое' }

interface Request {
  id: string; title: string; body: string | null; type: string; content_level: string
  fandom_type: string; pairing: string; tags: string[]; status: string; author_id: string; is_public: boolean
}

interface Props {
  request: Request
  user: { id: string; email: string } | null
  isAuthor: boolean
  isBookmarked: boolean
  existingGameId: string | null
}

const LEAVE_REASONS = ['Нет времени', 'Сменились интересы', 'Неподходящий партнёр', 'История завершена', 'Другое']

export default function RequestDetailClient({ request, user, isAuthor, isBookmarked: initBm, existingGameId }: Props) {
  const router = useRouter()
  const [bookmarked, setBookmarked] = useState(initBm)
  const [nickname, setNickname] = useState('Игрок')
  const [respondLoading, setRespondLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  async function toggleBookmark() {
    const method = bookmarked ? 'DELETE' : 'POST'
    const res = await fetch(`/api/bookmarks/${request.id}`, { method })
    if (res.ok) setBookmarked(b => !b)
    else { const d = await res.json(); alert(d.error) }
  }

  async function respond() {
    setRespondLoading(true)
    const res = await fetch(`/api/requests/${request.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    })
    const d = await res.json()
    if (res.ok) router.push(`/games/${d.gameId}`)
    else { alert(d.error); setRespondLoading(false) }
  }

  async function createInvite() {
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id }),
    })
    const d = await res.json()
    if (res.ok) setInviteUrl(`${window.location.origin}/invite/${d.token}`)
    else alert(d.error)
  }

  async function changeStatus(status: string) {
    setStatusLoading(true)
    await fetch(`/api/requests/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, status }),
    })
    router.refresh()
    setStatusLoading(false)
  }

  async function deleteRequest() {
    if (!confirm('Удалить заявку? Это действие необратимо.')) return
    setDeleteLoading(true)
    await fetch(`/api/requests/${request.id}`, { method: 'DELETE' })
    router.push('/my/requests')
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.75rem' }}>
      {/* Back */}
      <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.12em', color: 'var(--text-2)', textTransform: 'uppercase', display: 'inline-block', marginBottom: '2rem' }}>
        ← Лента
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text)', lineHeight: 1.2, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          {request.title}
        </h1>
        {user && (
          <button onClick={toggleBookmark} title={bookmarked ? 'Убрать из закладок' : 'В закладки'}
            style={{ fontSize: '1.4rem', color: bookmarked ? 'var(--accent)' : 'var(--border)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {bookmarked ? '★' : '☆'}
          </button>
        )}
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
        <span style={badge('type')}>{typeLabels[request.type]}</span>
        <span style={badge('fandom')}>{fandomTypeLabels[request.fandom_type]}</span>
        {request.pairing !== 'any' && <span style={badge('pairing')}>{pairingLabels[request.pairing]}</span>}
        <span style={badge('content')}>{contentLabels[request.content_level]}</span>
        {request.tags.map(t => <span key={t} style={badge('tag')}>#{t}</span>)}
      </div>

      {/* Body */}
      {request.body && (
        <div
          className="tiptap-content"
          style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'var(--bg-2)', border: '1px solid var(--border)' }}
          dangerouslySetInnerHTML={{ __html: request.body }}
        />
      )}

      {/* Actions */}
      {user && !isAuthor && request.status === 'active' && (
        existingGameId ? (
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text-2)', fontSize: '0.95rem' }}>Вы уже участвуете в этой игре</p>
            <Link href={`/games/${existingGameId}`}
              style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.95rem', padding: '0.55rem 1.25rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Открыть игру →
            </Link>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.75rem' }}>Твой никнейм в этой игре</p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={nickname} onChange={e => setNickname(e.target.value)}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--serif-body)', fontSize: '1rem', padding: '0.5rem 0.8rem', outline: 'none' }}
                placeholder="Игрок"
              />
              <button onClick={respond} disabled={respondLoading}
                style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.95rem', border: 'none', padding: '0.55rem 1.25rem', cursor: 'pointer' }}>
                {respondLoading ? '...' : 'Ответить →'}
              </button>
            </div>
          </div>
        )
      )}

      {/* Author controls */}
      {isAuthor && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Link href={`/requests/${request.id}/edit`}
            style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '0.4rem 0.9rem', display: 'inline-block' }}>
            Редактировать
          </Link>
          {request.status === 'active' && (
            <button onClick={() => changeStatus('inactive')} disabled={statusLoading}
              style={ghostBtn}>{statusLoading ? '...' : 'Снять из ленты'}</button>
          )}
          {request.status !== 'active' && (
            <button onClick={() => changeStatus('active')} disabled={statusLoading}
              style={ghostBtn}>{statusLoading ? '...' : 'Вернуть в ленту'}</button>
          )}
          <button onClick={createInvite} style={ghostBtn}>Создать инвайт-ссылку</button>
          <button onClick={deleteRequest} disabled={deleteLoading}
            style={{ ...ghostBtn, color: '#c0392b', borderColor: '#c0392b' }}>
            {deleteLoading ? '...' : 'Удалить'}
          </button>
        </div>
      )}

      {/* Invite URL */}
      {inviteUrl && (
        <div style={{ padding: '1rem', background: 'var(--bg-2)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text-2)', marginBottom: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Инвайт-ссылка</p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <code style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--accent)', wordBreak: 'break-all' }}>{inviteUrl}</code>
            <button onClick={() => { navigator.clipboard.writeText(inviteUrl) }}
              style={{ ...ghostBtn, flexShrink: 0 }}>Копировать</button>
          </div>
        </div>
      )}

      {!user && (
        <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
          <Link href="/auth/login" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Войди</Link>, чтобы ответить на заявку.
        </p>
      )}
    </div>
  )
}

function badge(variant: 'type' | 'fandom' | 'pairing' | 'content' | 'tag'): React.CSSProperties {
  const base: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.5rem', border: '1px solid' }
  if (variant === 'type')    return { ...base, color: 'var(--accent)', borderColor: 'var(--accent-dim)' }
  if (variant === 'fandom')  return { ...base, color: 'var(--accent-2)', borderColor: 'var(--accent-2)' }
  if (variant === 'pairing') return { ...base, color: 'var(--accent-2)', borderColor: 'var(--accent-2)' }
  if (variant === 'content') return { ...base, color: 'var(--text-2)', borderColor: 'var(--border)' }
  return { ...base, color: 'var(--text-2)', borderColor: 'transparent', background: 'var(--bg-3)' }
}

const ghostBtn: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)',
  padding: '0.4rem 0.9rem', cursor: 'pointer',
}
