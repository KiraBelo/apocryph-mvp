'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from './SettingsContext'
import { useToast } from './ToastProvider'

interface Props {
  token: string
  invite: { title: string; type: string }
}

export default function InviteClient({ token, invite }: Props) {
  const router = useRouter()
  const t = useT()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)

  async function accept() {
    setLoading(true)
    try {
      const res = await fetch(`/api/invites/${token}`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) router.push(`/games/${d.gameId}`)
      else { addToast(t(`errors.${d.error}`) as string || d.error, 'error'); setLoading(false) }
    } catch {
      addToast(t('errors.networkError') as string, 'error')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-8">
      <div className="max-w-[480px] text-center">
        <p className="section-label text-accent-2 mb-4">
          {t('invite.title') as string}
        </p>
        <h3 className="font-heading text-[2rem] italic text-ink mb-3">
          {invite.title}
        </h3>
        <p className="text-ink-2 font-body mb-5">
          {t('invite.typeLabel') as string} {invite.type === 'duo' ? t('invite.typeDuo') as string : t('invite.typeMultiplayer') as string}
        </p>
        <button onClick={accept} disabled={loading}
          className="btn-primary text-[1.05rem] py-3 px-8">
          {loading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('invite.accept') as string}
        </button>
      </div>
    </div>
  )
}
