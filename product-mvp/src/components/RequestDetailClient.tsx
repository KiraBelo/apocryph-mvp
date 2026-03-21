'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Breadcrumbs from './Breadcrumbs'
import { useT } from './SettingsContext'
import { useToast } from './ToastProvider'
import ConfirmDialog from './ConfirmDialog'

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

const LEAVE_REASONS_KEYS = ['game.leaveReasons'] as const

export default function RequestDetailClient({ request, user, isAuthor, isBookmarked: initBm, existingGameId }: Props) {
  const router = useRouter()
  const t = useT()
  const { addToast } = useToast()
  const [bookmarked, setBookmarked] = useState(initBm)
  const [nickname, setNickname] = useState(t('detail.nicknamePlaceholder') as string)
  const [respondLoading, setRespondLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [confirmState, setConfirmState] = useState<{ action: () => void; message: string } | null>(null)

  const contentLabels: Record<string, string> = {
    none: t('filters.noNsfw') as string, rare: t('filters.nsfwRare') as string,
    often: t('filters.nsfwOften') as string, core: t('filters.nsfwCore') as string,
    flexible: t('filters.nsfwFlexible') as string,
  }
  const typeLabels: Record<string, string> = { duo: t('filters.duo') as string, multiplayer: t('filters.multiplayer') as string }
  const fandomTypeLabels: Record<string, string> = { fandom: t('filters.fandom') as string, original: t('filters.original') as string }
  const pairingLabels: Record<string, string> = {
    sl: 'M/M', fm: 'F/F', gt: 'M/F',
    any: t('filters.anyPairing') as string, multi: t('filters.multi') as string, other: t('filters.other') as string,
  }

  async function toggleBookmark() {
    const method = bookmarked ? 'DELETE' : 'POST'
    const res = await fetch(`/api/bookmarks/${request.id}`, { method })
    if (res.ok) setBookmarked(b => !b)
    else { const d = await res.json(); addToast(t(`errors.${d.error}`) as string || d.error, 'error') }
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
    else { addToast(t(`errors.${d.error}`) as string || d.error, 'error'); setRespondLoading(false) }
  }

  async function createInvite() {
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: request.id }),
    })
    const d = await res.json()
    if (res.ok) setInviteUrl(`${window.location.origin}/invite/${d.token}`)
    else addToast(t(`errors.${d.error}`) as string || d.error, 'error')
  }

  async function changeStatus(status: string) {
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        addToast(t('errors.networkError') as string, 'error')
      }
    } catch {
      addToast(t('errors.networkError') as string, 'error')
    }
    setStatusLoading(false)
  }

  async function doDeleteRequest() {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/my/requests')
      } else {
        addToast(t('errors.networkError') as string, 'error')
        setDeleteLoading(false)
      }
    } catch {
      addToast(t('errors.networkError') as string, 'error')
      setDeleteLoading(false)
    }
  }

  function deleteRequest() {
    setConfirmState({
      action: () => doDeleteRequest(),
      message: t('detail.confirmDelete') as string,
    })
  }

  return (
    <div className="max-w-[1050px] mx-auto px-7 py-12">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: t('nav.feed') as string, href: '/feed' },
        { label: request.title },
      ]} />

      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-6">
        <h3 className="page-title leading-tight break-words">
          {request.title}
        </h3>
        {user && (
          <button onClick={toggleBookmark} title={bookmarked ? t('card.removeBookmark') as string : t('card.addBookmark') as string}
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
        {request.tags.map(tg => <span key={tg} className="badge text-ink-2 border-transparent bg-surface-3">{tg.toLowerCase()}</span>)}
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
            <p className="font-heading italic text-ink-2 text-[0.95rem]">{t('detail.alreadyParticipating') as string}</p>
            <Link href={`/games/${existingGameId}`} className="btn-primary text-[0.95rem] py-2 px-5 no-underline whitespace-nowrap">
              {t('detail.openGame') as string}
            </Link>
          </div>
        ) : (
          <div className="bg-surface-2 border border-edge p-6 mb-6">
            <p className="section-label mb-3">{t('detail.nicknameLabel') as string}</p>
            <div className="flex gap-3 items-center flex-wrap">
              <input
                value={nickname} onChange={e => setNickname(e.target.value)}
                className="input-base text-[1rem] py-2 px-3"
                style={{ width: 'auto' }}
                placeholder={t('detail.nicknamePlaceholder') as string}
              />
              <button onClick={respond} disabled={respondLoading} className="btn-primary text-[0.95rem] py-2 px-5">
                {respondLoading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('detail.respondButton') as string}
              </button>
            </div>
          </div>
        )
      )}

      {/* Author controls */}
      {isAuthor && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Link href={`/requests/${request.id}/edit`} className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5 inline-block no-underline">
            {t('detail.editButton') as string}
          </Link>
          {request.status === 'active' && (
            <button onClick={() => changeStatus('inactive')} disabled={statusLoading} className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5">
              {statusLoading ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('detail.deactivate') as string}
            </button>
          )}
          {request.status !== 'active' && (
            <button onClick={() => changeStatus('active')} disabled={statusLoading} className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5">
              {statusLoading ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('detail.activate') as string}
            </button>
          )}
          <button onClick={createInvite} className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5">
            {t('detail.createInvite') as string}
          </button>
          <button onClick={deleteRequest} disabled={deleteLoading}
            className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5 text-[#c0392b] border-[#c0392b]">
            {deleteLoading ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('detail.deleteButton') as string}
          </button>
        </div>
      )}

      {/* Invite URL */}
      {inviteUrl && (
        <div className="p-4 bg-surface-2 border border-edge mb-6">
          <p className="section-label mb-2">{t('detail.inviteLabel') as string}</p>
          <div className="flex gap-2 items-center">
            <code className="font-mono text-[0.85rem] text-accent break-all">{inviteUrl}</code>
            <button onClick={() => { navigator.clipboard?.writeText(inviteUrl).catch(() => {}) }}
              className="btn-ghost text-[0.7rem] tracking-[0.1em] uppercase py-1.5 px-3.5 shrink-0">{t('detail.copyButton') as string}</button>
          </div>
        </div>
      )}

      {!user && (
        <p className="text-ink-2 font-heading italic">
          <Link href="/auth/login" className="text-accent border-b border-current">{t('detail.loginToRespond') as string}</Link>{t('detail.loginToRespondSuffix') as string}
        </p>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={t('detail.confirmTitle') as string || 'Подтверждение'}
        message={confirmState?.message ?? ''}
        danger
        onConfirm={() => { confirmState?.action(); setConfirmState(null) }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}
