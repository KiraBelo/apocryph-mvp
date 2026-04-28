'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useT } from './SettingsContext'
import { useToast } from './ToastProvider'
import ConfirmDialog from './ConfirmDialog'

interface UserRow {
  id: string
  email: string
  role: string
  banned_at: string | null
  ban_reason: string | null
  created_at: string
}

export default function AdminUsers() {
  const t = useT()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [banModal, setBanModal] = useState<string | null>(null)
  const [banReason, setBanReason] = useState('')
  const [confirmState, setConfirmState] = useState<{ action: () => void; message: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}`)
      const data = await res.json()
      setUsers(data.users || [])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  async function handleBan(userId: string) {
    if (!banReason.trim()) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ban', reason: banReason.trim() }),
      })
      if (res.ok) {
        setBanModal(null)
        setBanReason('')
        load()
      } else {
        const data = await res.json().catch(() => ({}))
        addToast(data.error || 'Error', 'error')
      }
    } catch {
      addToast(t('errors.networkError') as string, 'error')
    }
  }

  async function handleUnban(userId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban' }),
      })
      if (res.ok) load()
      else {
        const data = await res.json().catch(() => ({}))
        addToast(data.error || 'Error', 'error')
      }
    } catch {
      addToast(t('errors.networkError') as string, 'error')
    }
  }

  function handleRole(userId: string, role: string) {
    const target = users.find(u => u.id === userId)
    setConfirmState({
      action: async () => {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_role', role }),
        })
        if (res.ok) load()
        else {
          const data = await res.json()
          addToast(data.error || 'Error', 'error')
          load() // revert select to current value
        }
      },
      message: `Изменить роль ${target?.email ?? userId} на "${role}"?`,
    })
  }

  const roleBadge = (role: string) => {
    if (role === 'admin') return <span className="badge badge-admin">admin</span>
    if (role === 'moderator') return <span className="badge badge-mod">mod</span>
    return null
  }

  return (
    <div className="max-w-[900px] mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="page-title">{t('admin.users') as string}</h1>
        <Link href="/admin" className="link-accent text-ink-2 font-mono text-[0.75rem]">
          ← {t('admin.dashboard') as string}
        </Link>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('admin.searchUsers') as string}
        className="input-base w-full mb-6 text-[0.9rem] p-[0.6rem_0.9rem]"
      />

      {loading ? (
        <p className="meta-text">...</p>
      ) : users.length === 0 ? (
        <p className="meta-text">{t('admin.noResults') as string}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map(u => (
            <div key={u.id} className="card p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[0.85rem] text-ink truncate">{u.email}</span>
                  {roleBadge(u.role)}
                  {u.banned_at && (
                    <span className="badge badge-danger">
                      {t('admin.banned') as string}
                    </span>
                  )}
                </div>
                <div className="meta-text mt-1">
                  {new Date(u.created_at).toLocaleDateString('ru')}
                  {u.banned_at && u.ban_reason && (
                    <span className="ml-2 text-danger">— {u.ban_reason}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {u.banned_at ? (
                  <button onClick={() => handleUnban(u.id)} className="btn-ghost text-[0.7rem] px-3 py-1">
                    {t('admin.unban') as string}
                  </button>
                ) : (
                  <button
                    onClick={() => { setBanModal(u.id); setBanReason('') }}
                    className="btn-ghost text-[0.7rem] px-3 py-1"
                  >
                    {t('admin.ban') as string}
                  </button>
                )}

                <select
                  value={u.role}
                  onChange={e => handleRole(u.id, e.target.value)}
                  className="select-base text-[0.7rem] py-1 px-2"
                >
                  <option value="user">user</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ban modal */}
      {banModal && (
        <div className="overlay" onClick={() => setBanModal(null)}>
          <div className="modal p-6 max-w-[420px] w-full" onClick={e => e.stopPropagation()}>
            <h3 className="section-label mb-4">{t('admin.banReason') as string}</h3>
            <textarea
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              maxLength={500}
              rows={3}
              className="input-base w-full mb-4 text-[0.85rem] p-2"
              placeholder={t('admin.banReasonPlaceholder') as string}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBanModal(null)} className="btn-ghost text-[0.8rem] px-4 py-1.5">
                {t('admin.cancel') as string}
              </button>
              <button
                onClick={() => handleBan(banModal)}
                disabled={!banReason.trim()}
                className="btn-primary text-[0.8rem] px-4 py-1.5"
              >
                {t('admin.ban') as string}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={t('admin.confirm') as string}
        message={confirmState?.message ?? ''}
        danger
        onConfirm={() => { confirmState?.action(); setConfirmState(null) }}
        onCancel={() => { setConfirmState(null); load() }}
      />
    </div>
  )
}
