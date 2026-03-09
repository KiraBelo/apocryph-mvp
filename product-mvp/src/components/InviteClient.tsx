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
    <div className="flex items-center justify-center min-h-[80vh] p-8">
      <div className="max-w-[480px] text-center">
        <p className="section-label text-accent-2 mb-4">
          Тебя приглашают в игру
        </p>
        <h3 className="font-heading text-[2rem] italic text-ink mb-3">
          {invite.title}
        </h3>
        <p className="text-ink-2 font-body mb-8">
          Тип: {invite.type === 'duo' ? 'На двоих' : 'Мультиплеер'}
        </p>
        <button onClick={accept} disabled={loading}
          className="btn-primary text-[1.05rem] py-3 px-8">
          {loading ? '...' : 'Принять приглашение →'}
        </button>
      </div>
    </div>
  )
}
