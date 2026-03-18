'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useT } from './SettingsContext'

interface Phrase {
  id: number
  phrase: string
  note: string | null
  is_active: boolean
  created_at: string
  created_by_email: string | null
}

interface Violation {
  id: number
  game_id: string
  phrase: string
  phrase_note: string | null
  matched_text: string
  message_type: string
  auto_hidden: boolean
  created_at: string
  request_title: string | null
}

const TABS = ['phrases', 'violations'] as const

export default function AdminStopList() {
  const t = useT()
  const [tab, setTab] = useState<string>('phrases')
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [newPhrase, setNewPhrase] = useState('')
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)

  const loadPhrases = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stop-list')
      const data = await res.json()
      setPhrases(data.phrases || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadViolations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/violations')
      const data = await res.json()
      setViolations(data.violations || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'phrases') loadPhrases()
    else loadViolations()
  }, [tab, loadPhrases, loadViolations])

  async function addPhrase() {
    if (!newPhrase.trim() || newPhrase.trim().length < 3) return
    setAdding(true)
    const res = await fetch('/api/admin/stop-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase: newPhrase.trim(), note: newNote.trim() || null }),
    })
    if (res.ok) {
      setNewPhrase('')
      setNewNote('')
      loadPhrases()
    } else {
      const data = await res.json()
      alert(data.error || 'Error')
    }
    setAdding(false)
  }

  async function toggleActive(id: number, isActive: boolean) {
    try {
      const res = await fetch(`/api/admin/stop-list/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      if (res.ok) {
        loadPhrases()
      } else {
        alert(t('errors.networkError') as string)
      }
    } catch { alert(t('errors.networkError') as string) }
  }

  async function deletePhrase(id: number) {
    if (!confirm(t('admin.stopConfirmDelete') as string)) return
    try {
      const res = await fetch(`/api/admin/stop-list/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadPhrases()
      } else {
        alert(t('errors.networkError') as string)
      }
    } catch { alert(t('errors.networkError') as string) }
  }

  const tabLabels: Record<string, string> = {
    phrases: t('admin.stopPhrases') as string,
    violations: t('admin.stopViolations') as string,
  }

  return (
    <div className="max-w-[900px] mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-title">{t('admin.stopList') as string}</h1>
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

      {tab === 'phrases' && (
        <>
          {/* Add form */}
          <div className="card p-4 mb-6 flex flex-col gap-3">
            <p className="section-label">{t('admin.stopAddPhrase') as string}</p>
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  value={newPhrase}
                  onChange={e => setNewPhrase(e.target.value)}
                  placeholder={t('admin.stopPhrase') as string}
                  className="input-base w-full text-[0.85rem] p-[0.5rem_0.7rem]"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <input
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder={`${t('admin.stopNote') as string} (${t('admin.stopNote') as string})`}
                  className="input-base w-full text-[0.85rem] p-[0.5rem_0.7rem]"
                />
              </div>
              <button
                onClick={addPhrase}
                disabled={adding || newPhrase.trim().length < 3}
                className="btn-primary text-[0.75rem] px-4 py-2 shrink-0"
              >
                {adding ? '...' : t('admin.stopAddPhrase') as string}
              </button>
            </div>
          </div>

          {/* Phrases list */}
          {loading ? (
            <p className="meta-text">{t('admin.loading') as string}</p>
          ) : phrases.length === 0 ? (
            <p className="meta-text">{t('admin.stopNoPhrases') as string}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {phrases.map(p => (
                <div key={p.id} className="card p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[0.85rem] text-ink">{p.phrase}</code>
                      {!p.is_active && (
                        <span className="badge" style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>
                          OFF
                        </span>
                      )}
                    </div>
                    {p.note && <p className="meta-text mt-1">{p.note}</p>}
                    <p className="meta-text mt-1">
                      {new Date(p.created_at).toLocaleDateString('ru')}
                      {p.created_by_email && <span className="ml-2">— {p.created_by_email}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(p.id, p.is_active)}
                      className={`btn-ghost text-[0.7rem] px-3 py-1 ${p.is_active ? '' : 'text-accent border-accent'}`}
                    >
                      {p.is_active ? 'OFF' : 'ON'}
                    </button>
                    <button
                      onClick={() => deletePhrase(p.id)}
                      className="btn-ghost text-[0.7rem] px-3 py-1 text-[#c0392b] border-[#c0392b]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'violations' && (
        <>
          {loading ? (
            <p className="meta-text">{t('admin.loading') as string}</p>
          ) : violations.length === 0 ? (
            <p className="meta-text">{t('admin.stopNoViolations') as string}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {violations.map(v => (
                <div key={v.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="font-mono text-[0.8rem] text-accent">{v.phrase}</code>
                        <span className="badge badge-tag">{v.message_type.toUpperCase()}</span>
                        {v.auto_hidden && (
                          <span className="badge" style={{ background: '#c0392b22', color: '#c0392b' }}>
                            {t('admin.stopAutoHidden') as string}
                          </span>
                        )}
                      </div>
                      <p className="text-ink-2 text-[0.8rem] mt-1">
                        {t('admin.stopContext') as string}: <span className="font-mono">«{v.matched_text}»</span>
                      </p>
                      {v.request_title && (
                        <p className="meta-text mt-1">{v.request_title}</p>
                      )}
                      <p className="meta-text mt-1">
                        {new Date(v.created_at).toLocaleString('ru')}
                      </p>
                    </div>
                    <Link
                      href={`/games/${v.game_id}`}
                      className="btn-ghost text-[0.7rem] px-3 py-1 text-center no-underline shrink-0"
                    >
                      {t('admin.openGame') as string}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
