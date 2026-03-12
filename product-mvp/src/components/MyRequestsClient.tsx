'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useT } from './SettingsContext'

export interface MyRequest {
  id: string; title: string; body: string | null; type: string; content_level: string
  fandom_type: string; pairing: string; tags: string[]
  status: string; is_public: boolean; created_at: string
}

export default function MyRequestsClient({ requests: initial, initialTab = 'active' }: { requests: MyRequest[], initialTab?: 'all' | 'active' | 'draft' | 'inactive' }) {
  const t = useT()
  const [requests, setRequests] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'inactive'>(initialTab)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)
  const [inviteUrlFor, setInviteUrlFor] = useState<{ id: string; url: string } | null>(null)

  const statusLabel: Record<string, string> = { draft: t('myRequests.drafts') as string, active: t('myRequests.inFeed') as string, inactive: t('myRequests.inactive') as string }
  const statusColor: Record<string, string> = { draft: 'var(--text-2)', active: 'var(--accent)', inactive: 'var(--text-2)' }
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
      if (!res.ok) { alert(t('errors.generic') as string); return }
      const { token } = await res.json()
      const url = `${window.location.origin}/invite/${token}`
      try {
        await navigator.clipboard.writeText(url)
        setCopied(id)
        setTimeout(() => setCopied(null), 2000)
      } catch {
        setInviteUrlFor({ id, url })
      }
    } catch { alert(t('errors.networkError') as string) }
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
        <p className="text-ink-2 font-heading italic">{t('myRequests.noRequests') as string}</p>
      )}

      <div className="flex flex-col gap-[var(--game-gap,1rem)]">
        {filtered.map(r => {
          const plainText = (r.body ?? '').replace(/<[^>]+>/g, '')
          const isLong = plainText.length > 1000
          const exp = expanded.has(r.id)
          return (
            <div key={r.id} className="bg-surface-2 border border-edge p-[1.25rem_1.5rem]">

              {/* Invite URL (shown when clipboard unavailable) */}
              {inviteUrlFor?.id === r.id && (
                <div className="mb-2 p-2.5 bg-surface-3 border border-edge flex items-center gap-2">
                  <code className="font-mono text-[0.75rem] text-accent break-all select-all flex-1">{inviteUrlFor.url}</code>
                  <button onClick={() => setInviteUrlFor(null)} className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.7rem] shrink-0">✕</button>
                </div>
              )}

              {/* Icons + status row */}
              <div className="flex justify-end gap-1 items-center mb-2 relative">
                <span className="font-mono text-[0.6rem] tracking-[0.1em] uppercase mr-1" style={{ color: statusColor[r.status] }}>
                  {statusLabel[r.status]}
                </span>
                <button onClick={() => copyInvite(r.id)} title={t('card.copyInvite') as string}
                  className={`bg-transparent border-none p-0 leading-none cursor-pointer flex items-center transition-[color,opacity] duration-150
                    ${copied === r.id ? 'text-accent' : 'text-ink-2 icon-dim'}`}
                >{copied === r.id ? '✓' : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}</button>
                <Link href={`/requests/${r.id}/edit`} title={t('card.edit') as string}
                  className="font-mono text-[0.9rem] text-ink-2 p-[0.2rem_0.3rem] leading-none icon-dim no-underline inline-block scale-x-[-1]"
                >✎</Link>
                <button onClick={() => setConfirmDelete(r.id)} title={t('detail.deleteButton') as string}
                  className="bg-transparent border-none font-mono text-[0.75rem] text-ink-2 p-[0.2rem_0.3rem] leading-none cursor-pointer opacity-50 hover:opacity-100 hover:text-accent"
                >✕</button>

                {/* Delete confirmation */}
                {confirmDelete === r.id && (
                  <div className="absolute top-full right-0 z-10 bg-surface border border-accent p-[0.6rem_0.9rem] flex items-center gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                    <span className="meta-text text-ink">{t('myRequests.deleteConfirm') as string}</span>
                    <button onClick={() => deleteRequest(r.id)} className="meta-text bg-accent text-white border-none py-1 px-2.5 cursor-pointer">
                      {t('myRequests.yes') as string}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="btn-ghost py-1 px-2.5">
                      {t('myRequests.no') as string}
                    </button>
                  </div>
                )}
              </div>

              {/* Title + tags row */}
              <div className="flex items-start gap-3">
                {r.status === 'active'
                  ? <button onClick={() => changeStatus(r.id, 'inactive')} title={t('myRequests.unpublish') as string} className="icon-action-btn">⏸</button>
                  : <button onClick={() => changeStatus(r.id, 'active')} title={t('myRequests.publishToFeed') as string} className="icon-action-btn text-accent border-accent-dim hover:border-accent">▶</button>
                }
                <div className="flex-1">
                  <div className="mb-1">
                    <Link href={`/requests/${r.id}`} className="font-heading text-[1.1rem] text-ink break-words">
                      {r.title}
                    </Link>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="badge badge-type">{typeLabels[r.type] ?? r.type}</span>
                    <span className="badge badge-fandom">{fandomTypeLabels[r.fandom_type] ?? r.fandom_type}</span>
                    {r.pairing !== 'any' && <span className="badge badge-fandom">{pairingLabels[r.pairing] ?? r.pairing}</span>}
                    <span className="badge badge-content">{contentLabels[r.content_level] ?? r.content_level}</span>
                    {r.tags.slice(0, 4).map(tg => (
                      <span key={tg} className="badge badge-tag">{tg.toLowerCase()}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Body preview */}
              {r.body && (
                <div className="mt-3 pl-11">
                  <div className="relative">
                    {!isLong || exp ? (
                      <div
                        className="text-ink-2 text-[0.9rem] leading-relaxed break-words"
                        dangerouslySetInnerHTML={{ __html: r.body }}
                      />
                    ) : (
                      <>
                        <div className="text-ink-2 text-[0.9rem] leading-relaxed whitespace-pre-wrap break-words">
                          {plainText.slice(0, 1000)}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-surface-2 pointer-events-none" />
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
                      className="link-accent bg-transparent border-none cursor-pointer block pt-[0.2rem] text-[0.62rem]"
                    >
                      {exp ? t('card.collapse') as string : t('card.readMore') as string}
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
