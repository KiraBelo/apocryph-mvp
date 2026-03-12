'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useT } from './SettingsContext'

interface Report {
  id: string
  game_id: string
  reporter_id: string
  reason: string
  status: string
  created_at: string
  resolved_by: string | null
  resolved_at: string | null
  moderation_status: string
  request_title: string | null
  pending_count: string
}

const TABS = ['pending', 'resolved', 'dismissed'] as const

export default function AdminReports() {
  const t = useT()
  const [tab, setTab] = useState<string>('pending')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports?status=${tab}`)
      const data = await res.json()
      setReports(data.reports || [])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { load() }, [load])

  async function handleAction(reportId: string, status: 'resolved' | 'dismissed') {
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setReports(prev => prev.filter(r => r.id !== reportId))
    }
  }

  async function handleGameStatus(gameId: string, moderationStatus: string) {
    await fetch(`/api/admin/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moderation_status: moderationStatus }),
    })
    load()
  }

  const tabLabels: Record<string, string> = {
    pending: t('admin.pending') as string,
    resolved: t('admin.resolved') as string,
    dismissed: t('admin.dismissed') as string,
  }

  return (
    <div className="max-w-[900px] mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-title">{t('admin.reports') as string}</h1>
        <Link href="/admin" className="link-accent text-ink-2 font-mono text-[0.75rem]">
          ← {t('admin.dashboard') as string}
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`font-mono text-[0.72rem] uppercase tracking-wider px-4 py-1.5 border transition-colors cursor-pointer ${
              tab === key
                ? 'bg-accent text-white border-accent'
                : 'bg-transparent text-ink-2 border-edge hover:border-accent'
            }`}
          >
            {tabLabels[key]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="meta-text">{t('admin.loading') as string || '...'}</p>
      ) : reports.length === 0 ? (
        <p className="meta-text">{t('admin.noReports') as string}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map(r => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-heading text-[1.05rem] italic text-ink truncate">
                      {r.request_title || 'Без названия'}
                    </span>
                    <span className="badge badge-tag">
                      {r.pending_count} {t('admin.reportCount') as string}
                    </span>
                    {r.moderation_status !== 'visible' && (
                      <span className="badge" style={{ background: '#c0392b22', color: '#c0392b' }}>
                        {r.moderation_status}
                      </span>
                    )}
                  </div>
                  <p className="font-body text-[0.85rem] text-ink-2 mt-1 line-clamp-2">{r.reason}</p>
                  <p className="meta-text mt-2">
                    {new Date(r.created_at).toLocaleDateString('ru')}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    href={`/games/${r.game_id}`}
                    className="btn-ghost text-[0.7rem] px-3 py-1 text-center no-underline"
                  >
                    {t('admin.openGame') as string}
                  </Link>
                  {tab === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAction(r.id, 'resolved')}
                        className="btn-primary text-[0.7rem] px-3 py-1"
                      >
                        {t('admin.resolve') as string}
                      </button>
                      <button
                        onClick={() => handleAction(r.id, 'dismissed')}
                        className="btn-ghost text-[0.7rem] px-3 py-1"
                      >
                        {t('admin.dismiss') as string}
                      </button>
                    </>
                  )}
                  {r.moderation_status !== 'visible' ? (
                    <button
                      onClick={() => handleGameStatus(r.game_id, 'visible')}
                      className="btn-ghost text-[0.7rem] px-3 py-1"
                    >
                      {t('admin.unhideGame') as string}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGameStatus(r.game_id, 'hidden')}
                      className="btn-ghost text-[0.7rem] px-3 py-1"
                    >
                      {t('admin.hideGame') as string}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
