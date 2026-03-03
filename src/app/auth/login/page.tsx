'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
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
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push(next)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '2.4rem', fontStyle: 'italic', marginBottom: '0.5rem', color: 'var(--text)' }}>
          Войти
        </h1>
        <p style={{ color: 'var(--text-2)', marginBottom: '2.5rem', fontFamily: 'var(--serif-body)' }}>
          Тестовый аккаунт: <code style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>test@test.com</code> / <code style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>apocryph123</code>
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Email</span>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={inputStyle} placeholder="your@email.com"
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Пароль</span>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                style={{ ...inputStyle, paddingRight: '2.5rem' }} placeholder="••••••"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: '0.1rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
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

          {error && <p style={{ color: '#c0392b', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{error}</p>}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '...' : 'Войти →'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', color: 'var(--text-2)', fontFamily: 'var(--serif-body)', fontSize: '0.95rem' }}>
          Нет аккаунта?{' '}
          <Link href="/auth/register" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-2)', border: '1px solid var(--border)',
  color: 'var(--text)', fontFamily: 'var(--serif-body)', fontSize: '1rem',
  padding: '0.65rem 0.9rem', outline: 'none', width: '100%',
}

const btnStyle: React.CSSProperties = {
  background: 'var(--accent)', color: '#fff',
  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1rem',
  padding: '0.7rem 1.4rem', border: 'none', cursor: 'pointer',
  marginTop: '0.25rem',
}
