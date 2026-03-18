'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/components/SettingsContext'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useT()
  const next = searchParams.get('next') || '/feed'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      let msg = t(`errors.${data.error}`) as string || data.error
      if (data.error === 'banned' && data.reason) msg += ': ' + data.reason
      setError(msg); setLoading(false); return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-8">
      <div className="w-full max-w-[420px]">
        <h1 className="font-heading text-[2.4rem] italic mb-2 text-ink">
          {t('auth.loginTitle') as string}
        </h1>
        <p className="text-ink-2 mb-10 font-body">
          {t('auth.testAccount') as string} <code className="font-mono text-[0.85rem]">test@test.com</code> / <code className="font-mono text-[0.85rem]">apocryph123</code>
        </p>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-[0.4rem]">
            <span className="section-label">{t('auth.email') as string}</span>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255}
              className="input-base text-[1rem] p-[0.65rem_0.9rem] w-full" placeholder="your@email.com"
            />
          </label>

          <div className="flex flex-col gap-[0.4rem]">
            <span className="section-label">{t('auth.password') as string}</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required maxLength={128}
                className="input-base text-[1rem] p-[0.65rem_0.9rem] pr-10 w-full" placeholder={t('auth.passwordPlaceholder') as string}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-[0.6rem] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-ink-2 p-[0.1rem] leading-none flex items-center">
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-[#c0392b] font-mono text-[0.8rem]">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary text-[1rem] p-[0.7rem_1.4rem] mt-1">
            {loading ? '...' : t('auth.loginButton') as string}
          </button>
        </form>

        <p className="mt-4 text-ink-2 font-body text-[0.95rem]">
          <Link href="/auth/forgot-password" className="text-accent border-b border-current">
            {t('auth.forgotPassword') as string}
          </Link>
        </p>

        <p className="mt-4 text-ink-2 font-body text-[0.95rem]">
          {t('auth.noAccount') as string}{' '}
          <Link href="/auth/register" className="text-accent border-b border-current">
            {t('auth.registerLink') as string}
          </Link>
        </p>
      </div>
    </div>
  )
}
