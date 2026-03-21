'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/components/SettingsContext'

export default function ForgotPasswordPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(t(`errors.${d.error}`) as string || t('errors.networkError') as string)
        return
      }
      setSent(true)
    } catch {
      setError(t('errors.networkError') as string)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-8">
      <div className="w-full max-w-[420px]">
        <h1 className="font-heading text-[2.4rem] italic mb-6 text-ink">
          {t('auth.forgotTitle') as string}
        </h1>

        {sent ? (
          <div>
            <p className="text-ink-2 font-body mb-6">{t('auth.forgotSuccess') as string}</p>
            <Link href="/auth/login" className="text-accent border-b border-current font-body">
              {t('auth.loginLink') as string}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-[0.4rem]">
              <span className="section-label">{t('auth.email') as string}</span>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255}
                className="input-base text-[1rem] p-[0.65rem_0.9rem] w-full"
                placeholder={t('auth.forgotEmail') as string}
              />
            </label>

            {error && <p className="text-[#c0392b] font-mono text-[0.8rem]">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary text-[1rem] p-[0.7rem_1.4rem] mt-1">
              {loading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('auth.forgotSubmit') as string}
            </button>

            <p className="text-ink-2 font-body text-[0.95rem]">
              <Link href="/auth/login" className="text-accent border-b border-current">
                {t('auth.loginLink') as string}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
