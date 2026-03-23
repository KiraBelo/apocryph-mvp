'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useT } from './SettingsContext'
import { useToast } from './ToastProvider'
import { Link2, Pencil, X, Check, Play, Pause, ChevronRight } from 'lucide-react'

export interface MyRequest {
  id: string; title: string; body: string | null; type: string; content_level: string
  fandom_type: string; pairing: string; tags: string[]
  status: string; is_public: boolean; created_at: string
}

export default function MyRequestsClient({ requests: initial, initialTab = 'active' }: { requests: MyRequest[], initialTab?: 'all' | 'active' | 'draft' | 'inactive' }) {
  const t = useT()
  const { addToast } = useToast()
  const [requests, setRequests] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'inactive'>(initialTab)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [inviteUrlFor, setInviteUrlFor] = useState<{ id: string; url: string } | null>(null)

  const statusLabel: Record<string, string> = { draft: t('myRequests.drafts') as string, active: t('myRequests.inFeed') as string, inactive: t('myRequests.inactive') as string }
  const typeLabels: Record<string, string> = { duo: t('filters.duo') as string, multiplayer: t('filters.multiplayer') as string }
  const fandomTypeLabels: Record<string, string> = { fandom: t('filters.fandom') as string, original: t('filters.original') as string }
  const pairingLabels: Record<string, string> = { sl: 'M/M', fm: 'F/F', gt: 'M/F', any: t('filters.anyPairing') as string, multi: t('filters.multi') as string, other: t('filters.other') as string }
  const contentLabels: Record<string, string> = { none: t('filters.noNsfw') as string, rare: t('filters.nsfwRare') as string, often: t('filters.nsfwOften') as string, core: t('filters.nsfwCore') as string, flexible: t('filters.nsfwFlexible') as string }

  async function copyInvite(id: string) {
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      })
      if (!res.ok) { addToast(t('errors.generic') as string, 'error'); return }
      const { token } = await res.json()
      const url = `${window.location.origin}/invite/${token}`
      try {
        await navigator.clipboard.writeText(url)
        setCopied(id)
        setTimeout(() => setCopied(null), 2000)
      } catch {
        setInviteUrlFor({ id, url })
      }
    } catch { addToast(t('errors.networkError') as string, 'error') }
  }

  const filtered: MyRequest[] = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  async function changeStatus(id: string, status: string) {
    const oldStatus = requests.find(r => r.id === id)?.status
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: oldStatus ?? r.status } : r))
        addToast(t('errors.networkError') as string, 'error')
      }
    } catch {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: oldStatus ?? r.status } : r))
      addToast(t('errors.networkError') as string, 'error')
    }
  }

  async function deleteRequest(id: string) {
    setConfirmDelete(null)
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id))
      } else {
        addToast(t('errors.networkError') as string, 'error')
      }
    } catch { addToast(t('errors.networkError') as string, 'error') }
  }

  return (
    <div>
      {/* Tab filter */}
      <div className="flex gap-0 mb-6 border-b border-edge">
        {(['active', 'inactive', 'draft', 'all'] as const).map(f => {
          const count = f === 'all' ? requests.length : requests.filter(r => r.status === f).length
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`font-mono text-[0.68rem] tracking-[0.1em] uppercase bg-transparent border-none cursor-pointer py-2.5 px-4 -mb-px
                ${filter === f ? 'text-accent border-b-2 border-accent' : 'text-ink-2 border-b-2 border-transparent'}`}>
              {f === 'all' ? t('myRequests.allRequests') as string : statusLabel[f]}
              {' '}
              <span className="opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-ink-2 font-heading italic mb-4">{t('myRequests.noRequests') as string}</p>
          <Link href="/requests/new" className="btn-primary inline-block no-underline py-2.5 px-6 text-[0.9rem]">
            {t('myRequests.createFirst') as string}
          </Link>
        </div>
      )}

      <div className="grid gap-[var(--game-gap,1rem)]">
        {filtered.map(r => (
          <MyRequestCard
            key={r.id}
            r={r}
            statusLabel={statusLabel}
            typeLabels={typeLabels}
            fandomTypeLabels={fandomTypeLabels}
            pairingLabels={pairingLabels}
            contentLabels={contentLabels}
            copied={copied === r.id}
            inviteUrl={inviteUrlFor?.id === r.id ? inviteUrlFor.url : null}
            confirmDelete={confirmDelete === r.id}
            onCopyInvite={() => copyInvite(r.id)}
            onCloseInvite={() => setInviteUrlFor(null)}
            onChangeStatus={changeStatus}
            onDeleteRequest={deleteRequest}
            onConfirmDelete={() => setConfirmDelete(r.id)}
            onCancelDelete={() => setConfirmDelete(null)}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}

function MyRequestCard({ r, statusLabel, typeLabels, fandomTypeLabels, pairingLabels, contentLabels, copied, inviteUrl, confirmDelete, onCopyInvite, onCloseInvite, onChangeStatus, onDeleteRequest, onConfirmDelete, onCancelDelete, t }: {
  r: MyRequest
  statusLabel: Record<string, string>
  typeLabels: Record<string, string>
  fandomTypeLabels: Record<string, string>
  pairingLabels: Record<string, string>
  contentLabels: Record<string, string>
  copied: boolean
  inviteUrl: string | null
  confirmDelete: boolean
  onCopyInvite: () => void
  onCloseInvite: () => void
  onChangeStatus: (id: string, status: string) => void
  onDeleteRequest: (id: string) => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  t: (key: string) => unknown
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [isLong, setIsLong] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    requestAnimationFrame(() => {
      const style = getComputedStyle(document.documentElement)
      const maxBody = parseFloat(style.getPropertyValue('--card-body-size')) * 1.65 * parseFloat(style.getPropertyValue('--card-body-lines'))
      const rootFontSize = parseFloat(style.fontSize)
      const maxPx = maxBody * rootFontSize
      setIsLong(el.scrollHeight > maxPx + 1)
    })
  }, [r.body])

  const metaParts = [
    typeLabels[r.type],
    fandomTypeLabels[r.fandom_type],
    r.pairing !== 'any' ? pairingLabels[r.pairing] : null,
    contentLabels[r.content_level],
  ].filter(Boolean)

  return (
    <article className="card">
      {/* Invite URL (shown when clipboard unavailable) */}
      {inviteUrl && (
        <div className="p-2.5 bg-surface-3 border border-edge flex items-center gap-2">
          <code className="font-mono text-[0.75rem] text-accent break-all select-all flex-1">{inviteUrl}</code>
          <button onClick={onCloseInvite} className="bg-transparent border-none text-ink-2 cursor-pointer shrink-0 flex items-center"><X size={12} aria-hidden="true" /></button>
        </div>
      )}

      {/* Header: status + meta + actions */}
      <div className="card-header">
        <div className="card-meta">
          <span className={`card-status ${r.status === 'active' ? 'card-status-active' : 'card-status-dim'}`}>
            {statusLabel[r.status]}
          </span>
          <span className="sep">|</span>
          {metaParts.map((label, i) => (
            <span key={i}>
              {i > 0 && <span className="sep">/</span>}
              {label}
            </span>
          ))}
        </div>
        <div className="card-actions">
          <button
            onClick={onCopyInvite}
            title={t('card.copyInvite') as string}
            aria-label={t('card.copyInvite') as string}
            className={copied ? 'bookmarked' : ''}
          >
            {copied ? <Check size={13} aria-hidden="true" /> : <Link2 size={13} aria-hidden="true" />}
          </button>
          <Link
            href={`/requests/${r.id}/edit`}
            title={t('card.edit') as string}
            className="action-link"
            aria-label={t('card.edit') as string}
          >
            <Pencil size={12} aria-hidden="true" />
          </Link>
          <button
            onClick={onConfirmDelete}
            title={t('detail.deleteButton') as string}
            aria-label={t('detail.deleteButton') as string}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="flex items-center gap-3 p-[0.5rem_var(--card-px)] bg-accent-dim border-b border-accent">
          <span className="meta-text text-ink flex-1">{t('myRequests.deleteConfirm') as string}</span>
          <button onClick={() => onDeleteRequest(r.id)} className="font-mono text-[0.62rem] tracking-[0.08em] bg-accent text-white border-none py-1 px-2.5 cursor-pointer">
            {t('myRequests.yes') as string}
          </button>
          <button onClick={onCancelDelete} className="btn-ghost py-1 px-2.5">
            {t('myRequests.no') as string}
          </button>
        </div>
      )}

      {/* Title */}
      <Link href={`/requests/${r.id}`} className="card-title">
        {r.title}
      </Link>

      {/* Tags */}
      {r.tags.length > 0 && (
        <div className="card-tags">
          {r.tags.map(tg => (
            <span key={tg} className="tag tag-user">{tg.toLowerCase()}</span>
          ))}
        </div>
      )}

      {/* Body preview */}
      {r.body && (
        <>
          <div>
            <div
              ref={bodyRef}
              className={`card-body break-words ${isLong && !expanded ? 'card-body-clamped' : ''}`}
              onClick={() => { if (isLong) setExpanded(x => !x) }}
              dangerouslySetInnerHTML={{ __html: r.body }}
            />
            {isLong && !expanded && <div className="card-body-fade" />}
          </div>
          {isLong && !expanded && (
            <div className="card-body-dots" onClick={() => setExpanded(true)}>
              ···
            </div>
          )}
        </>
      )}

      {/* Footer: status toggle */}
      <div className="card-footer">
        <span className="card-own-label">
          {t('card.ownRequest') as string}
        </span>
        {r.status === 'active' ? (
          <button
            onClick={() => onChangeStatus(r.id, 'inactive')}
            title={t('myRequests.unpublish') as string}
            aria-label={t('myRequests.unpublish') as string}
            className="respond-pill"
          >
            {t('myRequests.unpublish') as string}
            <Pause size={11} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : (
          <button
            onClick={() => onChangeStatus(r.id, 'active')}
            title={t('myRequests.publishToFeed') as string}
            aria-label={t('myRequests.publishToFeed') as string}
            className="respond-pill"
          >
            {t('myRequests.publishToFeed') as string}
            <Play size={11} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  )
}
