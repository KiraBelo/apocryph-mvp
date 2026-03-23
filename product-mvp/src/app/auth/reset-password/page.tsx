'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/components/SettingsContext'
import { safeJson } from '@/lib/fetch-utils'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useT()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(t('auth.resetTooShort') as string)
      return
    }
    if (password !== confirm) {
      setError(t('auth.resetMismatch') as string)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const d = await safeJson(res)
        if (d.error === 'resetExpired') {
          setError(t('auth.resetExpired') as string)
        } else {
          setError(t(`errors.${d.error}`) as string || t('errors.networkError') as string)
        }
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    } catch {
      setError(t('errors.networkError') as string)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-8">
        <div className="w-full max-w-[420px]">
          <p className="text-ink-2 font-body">{t('auth.resetExpired') as string}</p>
          <Link href="/auth/forgot-password" className="text-accent border-b border-current font-body mt-4 inline-block">
            {t('auth.forgotPassword') as string}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-8">
      <div className="w-full max-w-[420px]">
        <h1 className="font-heading text-[2.4rem] italic mb-6 text-ink">
          {t('auth.resetTitle') as string}
        </h1>

        {success ? (
          <div>
            <p className="text-ink-2 font-body mb-6">{t('auth.resetSuccess') as string}</p>
            <Link href="/auth/login" className="text-accent border-b border-current font-body">
              {t('auth.loginLink') as string}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-[0.4rem]">
              <span className="section-label">{t('auth.resetPassword') as string}</span>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} maxLength={128}
                className="input-base text-[1rem] p-[0.65rem_0.9rem] w-full"
                placeholder={t('auth.passwordPlaceholder') as string}
              />
            </label>

            <label className="flex flex-col gap-[0.4rem]">
              <span className="section-label">{t('auth.resetConfirm') as string}</span>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} maxLength={128}
                className="input-base text-[1rem] p-[0.65rem_0.9rem] w-full"
                placeholder={t('auth.passwordPlaceholder') as string}
              />
            </label>

            {error && <p className="text-[#c0392b] font-mono text-[0.8rem]">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary text-[1rem] p-[0.7rem_1.4rem] mt-1">
              {loading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('auth.resetSubmit') as string}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
