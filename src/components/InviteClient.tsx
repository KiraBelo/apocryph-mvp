'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
  invite: { title: string; type: string }
}

export default function InviteClient({ token, invite }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function accept() {
    setLoading(true)
    const res = await fetch(`/api/invites/${token}`, { method: 'POST' })
    const d = await res.json()
    if (res.ok) router.push(`/games/${d.gameId}`)
    else { alert(d.error); setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem' }}>
      <div style={{ maxWidth: '480px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '1rem' }}>
          Тебя приглашают в игру
        </p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontStyle: 'italic', color: 'var(--text)', marginBottom: '0.75rem' }}>
          {invite.title}
        </h1>
        <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif-body)', marginBottom: '2rem' }}>
          Тип: {invite.type === 'duo' ? 'На двоих' : 'Мультиплеер'}
        </p>
        <button onClick={accept} disabled={loading}
          style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.05rem', border: 'none', padding: '0.75rem 2rem', cursor: 'pointer' }}>
          {loading ? '...' : 'Принять приглашение →'}
        </button>
      </div>
    </div>
  )
}
