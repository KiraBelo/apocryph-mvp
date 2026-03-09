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

const LEAVE_REASONS = ['Спасибо, всё было здорово', 'Сейчас нет времени продолжать', 'Формат игры не подошёл', 'Ожидания от игры не совпали', 'Сменились интересы']

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
    <div className="max-w-[1050px] mx-auto px-7 py-12">
      {/* Back */}
      <Link href="/" className="link-accent text-ink-2 inline-block mb-8">
        ← Лента
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-6">
        <h3 className="page-title leading-tight break-words">
          {request.title}
        </h3>
        {user && (
          <button onClick={toggleBookmark} title={bookmarked ? 'Убрать из закладок' : 'В закладки'}
            className={`text-[1.4rem] bg-transparent border-none cursor-pointer shrink-0 ${bookmarked ? 'text-accent' : 'text-edge'}`}>
            {bookmarked ? '★' : '☆'}
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-8">
        <span className="badge badge-type">{typeLabels[request.type]}</span>
        <span className="badge badge-fandom">{fandomTypeLabels[request.fandom_type]}</span>
        {request.pairing !== 'any' && <span className="badge badge-fandom">{pairingLabels[request.pairing]}</span>}
        <span className="badge badge-content">{contentLabels[request.content_level]}</span>
        {request.tags.map(t => <span key={t} className="badge text-ink-2 border-transparent bg-surface-3">{t.toLowerCase()}</span>)}
      </div>

      {/* Body */}
      {request.body && (
        <div
          className="tiptap-content mb-10 p-6 bg-surface-2 border border-edge"
          onClick={e => { const el = e.target as HTMLElement; if (el.classList.contains('ooc-spoiler')) el.classList.toggle('ooc-spoiler-open') }}
          dangerouslySetInnerHTML={{ __html: request.body }}
        />
      )}

      {/* Actions */}
      {user && !isAuthor && request.status === 'active' && (
        existingGameId ? (
          <div className="bg-surface-2 border border-edge border-l-3 border-l-accent px-6 py-5 mb-6 flex items-center justify-between gap-4">
            <p className="font-heading italic text-ink-2 text-[0.95rem]">Вы уже участвуете в этой игре</p>
            <Link href={`/games/${existingGameId}`} className="btn-primary text-[0.95rem] py-2 px-5 no-underline whitespace-nowrap">
              Открыть игру →
            </Link>
          </div>
        ) : (
          <div className="bg-surface-2 border border-edge p-6 mb-6">
            <p className="section-label mb-3">Твой никнейм в этой игре</p>
            <div className="flex gap-3 items-center flex-wrap">
              <input
                value={nickname} onChange={e => setNickname(e.target.value)}
                className="input-base text-[1rem] py-2 px-3"
                style={{ width: 'auto' }}
                placeholder="Игрок"
              />
              <button onClick={respond} disabled={respondLoading} className="btn-primary text-[0.95rem] py-2 px-5">
                {respondLoading ? '...' : 'Ответить →'}
              </button>
            </div>
          </div>
        )
      )}

      {/* Author controls */}
      {isAuthor && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Link href={`/requests/${request.id}/edit`} className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5 inline-block no-underline">
            Редактировать
          </Link>
          {request.status === 'active' && (
            <button onClick={() => changeStatus('inactive')} disabled={statusLoading} className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5">
              {statusLoading ? '...' : 'Снять из ленты'}
            </button>
          )}
          {request.status !== 'active' && (
            <button onClick={() => changeStatus('active')} disabled={statusLoading} className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5">
              {statusLoading ? '...' : 'Вернуть в ленту'}
            </button>
          )}
          <button onClick={createInvite} className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5">
            Создать инвайт-ссылку
          </button>
          <button onClick={deleteRequest} disabled={deleteLoading}
            className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5 text-[#c0392b] border-[#c0392b]">
            {deleteLoading ? '...' : 'Удалить'}
          </button>
        </div>
      )}

      {/* Invite URL */}
      {inviteUrl && (
        <div className="p-4 bg-surface-2 border border-edge mb-6">
          <p className="section-label mb-2">Инвайт-ссылка</p>
          <div className="flex gap-2 items-center">
            <code className="font-mono text-[0.85rem] text-accent break-all">{inviteUrl}</code>
            <button onClick={() => { navigator.clipboard?.writeText(inviteUrl).catch(() => {}) }}
              className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5 shrink-0">Копировать</button>
          </div>
        </div>
      )}

      {!user && (
        <p className="text-ink-2 font-heading italic">
          <Link href="/auth/login" className="text-accent border-b border-current">Войди</Link>, чтобы ответить на заявку.
        </p>
      )}
    </div>
  )
}
