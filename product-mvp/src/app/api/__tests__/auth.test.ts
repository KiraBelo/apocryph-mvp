import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Моки (должны быть объявлены до импортов) ──────────────────────────────

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}))

// Мок iron-session / next/headers через lib/session
vi.mock('@/lib/session', () => {
  const mockSession = {
    userId: undefined as string | undefined,
    email: undefined as string | undefined,
    role: undefined as string | undefined,
    save: vi.fn().mockResolvedValue(undefined),
  }
  return {
    getSession: vi.fn().mockResolvedValue(mockSession),
    getUser: vi.fn().mockResolvedValue(null),
    requireUser: vi.fn().mockResolvedValue({ error: null, user: null, banReason: null }),
    requireMod: vi.fn().mockResolvedValue({ error: 'forbidden', user: null }),
    _mockSession: mockSession, // exposed for tests to inspect
  }
})

import { query, queryOne } from '@/lib/db'
import { POST as registerPOST } from '@/app/api/auth/register/route'
import { POST as loginPOST } from '@/app/api/auth/login/route'

const mockQuery = vi.mocked(query)
const mockQueryOne = vi.mocked(queryOne)

// Сброс rate-limit store и моков между тестами
// ВАЖНО: очищаем через .clear(), не заменяем — rate-limit.ts держит ссылку на тот же Map
beforeEach(() => {
  const g = globalThis as unknown as { __rateLimitStore?: Map<string, unknown> }
  g.__rateLimitStore?.clear()
  vi.clearAllMocks()
})

// ── Helpers ───────────────────────────────────────────────────────────────

function makeRequest(body: unknown, ip = '1.2.3.4'): NextRequest {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

// ── /api/auth/register ────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  describe('success', () => {
    it('returns 200 { ok: true } on valid registration', async () => {
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('password123', 10)
      const fakeUser = { id: 'uuid-new', email: 'new@example.com', password_hash: hash, created_at: '' }
      mockQuery.mockResolvedValueOnce([fakeUser])

      const req = makeRequest({ email: 'new@example.com', password: 'password123' })
      const res = await registerPOST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.ok).toBe(true)
    })
  })

  describe('validation errors → 400', () => {
    it('returns 400 when email is missing', async () => {
      const req = makeRequest({ password: 'password123' })
      const res = await registerPOST(req)
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('invalidData')
    })

    it('returns 400 when password is missing', async () => {
      const req = makeRequest({ email: 'a@b.com' })
      const res = await registerPOST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when password is too short (< 6 chars)', async () => {
      const req = makeRequest({ email: 'a@b.com', password: '123' })
      const res = await registerPOST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid email format', async () => {
      const req = makeRequest({ email: 'notanemail', password: 'password123' })
      const res = await registerPOST(req)
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('invalidData')
    })

    it('returns 400 for email without domain', async () => {
      const req = makeRequest({ email: 'user@', password: 'password123' })
      const res = await registerPOST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when email exceeds 255 chars', async () => {
      const longEmail = 'a'.repeat(250) + '@b.com'
      const req = makeRequest({ email: longEmail, password: 'password123' })
      const res = await registerPOST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when password exceeds 128 chars', async () => {
      const longPass = 'a'.repeat(129)
      const req = makeRequest({ email: 'a@b.com', password: longPass })
      const res = await registerPOST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 for malformed JSON body', async () => {
      const req = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
        body: 'not-json',
      })
      const res = await registerPOST(req)
      expect(res.status).toBe(400)
    })
  })

  describe('duplicate email → 409', () => {
    it('returns 409 when email already taken', async () => {
      mockQuery.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'))

      const req = makeRequest({ email: 'taken@example.com', password: 'password123' })
      const res = await registerPOST(req)

      expect(res.status).toBe(409)
      expect((await res.json()).error).toBe('emailTaken')
    })
  })

  describe('rate limiting → 429', () => {
    it('returns 429 after 3 attempts from same IP', async () => {
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('password123', 10)
      const fakeUser = { id: 'u1', email: 'a@b.com', password_hash: hash, created_at: '' }

      mockQuery.mockResolvedValue([fakeUser])

      const ip = '9.9.9.9'
      await registerPOST(makeRequest({ email: 'a@b.com', password: 'password123' }, ip))
      await registerPOST(makeRequest({ email: 'b@b.com', password: 'password123' }, ip))
      await registerPOST(makeRequest({ email: 'c@b.com', password: 'password123' }, ip))
      const res = await registerPOST(makeRequest({ email: 'd@b.com', password: 'password123' }, ip))

      expect(res.status).toBe(429)
      expect((await res.json()).error).toBe('tooManyAttempts')
    })

    it('different IPs have independent rate limits', async () => {
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('password123', 10)
      mockQuery.mockResolvedValue([{ id: 'u', email: 'x@x.com', password_hash: hash, created_at: '' }])

      // Исчерпать лимит для IP-A
      for (let i = 0; i < 3; i++) {
        await registerPOST(makeRequest({ email: `x${i}@b.com`, password: 'password123' }, '10.0.0.1'))
      }

      // IP-B должен проходить
      const resB = await registerPOST(makeRequest({ email: 'new@b.com', password: 'password123' }, '10.0.0.2'))
      expect(resB.status).not.toBe(429)
    })
  })
})

// ── /api/auth/login ───────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  function makeLoginRequest(body: unknown, ip = '5.5.5.5'): NextRequest {
    return new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify(body),
    })
  }

  describe('success', () => {
    it('returns 200 { ok: true } with correct credentials', async () => {
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('correctpass', 10)
      const fakeUser = {
        id: 'uuid-login',
        email: 'user@example.com',
        password_hash: hash,
        created_at: '',
        role: 'user',
        banned_at: null,
        ban_reason: null,
      }
      mockQueryOne.mockResolvedValueOnce(fakeUser)

      const req = makeLoginRequest({ email: 'user@example.com', password: 'correctpass' })
      const res = await loginPOST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.ok).toBe(true)
    })
  })

  describe('wrong credentials → 401', () => {
    it('returns 401 when user not found', async () => {
      mockQueryOne.mockResolvedValueOnce(null)

      const req = makeLoginRequest({ email: 'nobody@example.com', password: 'any' })
      const res = await loginPOST(req)

      expect(res.status).toBe(401)
      expect((await res.json()).error).toBe('wrongCredentials')
    })

    it('returns 401 when password is incorrect', async () => {
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('realpassword', 10)
      mockQueryOne.mockResolvedValueOnce({
        id: 'uuid-x',
        email: 'user@example.com',
        password_hash: hash,
        created_at: '',
        role: 'user',
        banned_at: null,
        ban_reason: null,
      })

      const req = makeLoginRequest({ email: 'user@example.com', password: 'wrongpassword' })
      const res = await loginPOST(req)

      expect(res.status).toBe(401)
    })
  })

  describe('banned user → 403', () => {
    it('returns 403 with ban reason when user is banned', async () => {
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('pass', 10)
      mockQueryOne.mockResolvedValueOnce({
        id: 'uuid-banned',
        email: 'banned@example.com',
        password_hash: hash,
        created_at: '',
        role: 'user',
        banned_at: '2026-01-01T00:00:00Z',
        ban_reason: 'violation of rules',
      })

      const req = makeLoginRequest({ email: 'banned@example.com', password: 'pass' })
      const res = await loginPOST(req)
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.error).toBe('banned')
      expect(data.reason).toBe('violation of rules')
    })

    it('returns 403 with null reason when ban_reason is null', async () => {
      const bcrypt = await import('bcryptjs')
      const hash = await bcrypt.hash('pass', 10)
      mockQueryOne.mockResolvedValueOnce({
        id: 'uuid-banned2',
        email: 'banned2@example.com',
        password_hash: hash,
        created_at: '',
        role: 'user',
        banned_at: '2026-01-01T00:00:00Z',
        ban_reason: null,
      })

      const req = makeLoginRequest({ email: 'banned2@example.com', password: 'pass' })
      const res = await loginPOST(req)
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.reason).toBeNull()
    })
  })

  describe('rate limiting → 429', () => {
    it('returns 429 after 5 failed attempts from same IP', async () => {
      mockQueryOne.mockResolvedValue(null) // все попытки — неверные данные

      const ip = '7.7.7.7'
      for (let i = 0; i < 5; i++) {
        await loginPOST(makeLoginRequest({ email: 'x@x.com', password: 'wrong' }, ip))
      }
      const res = await loginPOST(makeLoginRequest({ email: 'x@x.com', password: 'wrong' }, ip))

      expect(res.status).toBe(429)
      expect((await res.json()).error).toBe('tooManyAttempts')
    })
  })

  describe('malformed request', () => {
    it('returns 400 for invalid JSON', async () => {
      const req = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '5.5.5.5' },
        body: '{bad json',
      })
      const res = await loginPOST(req)
      expect(res.status).toBe(400)
    })
  })
})
