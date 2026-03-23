import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks (must be declared before imports) ───────────────────────────────

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  withTransaction: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  requireUser: vi.fn().mockResolvedValue({ error: null, user: { id: 'user-id', email: 'a@b.com', role: 'user' }, banReason: null }),
  getUser: vi.fn().mockResolvedValue(null),
  handleAuthError: (error: string | null) => {
    const { NextResponse } = require('next/server')
    if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
    if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })
    if (error === 'forbidden') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return null
  },
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeBody: vi.fn((html: string) => html),
}))

import { query, queryOne, withTransaction } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { POST } from '@/app/api/requests/route'

const mockQuery = vi.mocked(query)
const mockQueryOne = vi.mocked(queryOne)
const mockWithTransaction = vi.mocked(withTransaction)
const mockRequireUser = vi.mocked(requireUser)

// Reset rate-limit store and mocks between tests
beforeEach(() => {
  const g = globalThis as unknown as { __rateLimitStore?: Map<string, unknown> }
  g.__rateLimitStore?.clear()
  vi.clearAllMocks()
  // Default: user is authenticated
  mockRequireUser.mockResolvedValue({ error: null, user: { id: 'user-id', email: 'a@b.com', role: 'user' }, banReason: null })
})

// ── Helpers ───────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── POST /api/requests ────────────────────────────────────────────────────

describe('POST /api/requests', () => {
  // suppress unused variable warnings for mocks not used in all tests
  void mockQuery

  describe('authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockRequireUser.mockResolvedValueOnce({ error: 'unauthorized', user: null, banReason: null })

      const req = makeRequest({ title: 'Test', type: 'duo', content_level: 'none' })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.error).toBe('unauthorized')
    })
  })

  describe('validation errors → 400', () => {
    it('returns 400 with fillRequired when title is missing', async () => {
      const req = makeRequest({ type: 'duo', content_level: 'none' })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('fillRequired')
    })

    it('returns 400 with fillRequired when type is missing', async () => {
      const req = makeRequest({ title: 'Test', content_level: 'none' })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('fillRequired')
    })

    it('returns 400 with titleTooLong when title exceeds 200 chars', async () => {
      const req = makeRequest({ title: 'a'.repeat(201), type: 'duo', content_level: 'none' })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('titleTooLong')
    })

    it('returns 400 with bodyTooLong when description exceeds 200000 chars', async () => {
      const req = makeRequest({ title: 'Test', type: 'duo', content_level: 'none', description: 'x'.repeat(200_001) })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('bodyTooLong')
    })

    it('returns 400 with tooManyTags when more than 20 tags are provided', async () => {
      const req = makeRequest({ title: 'Test', type: 'duo', content_level: 'none', tags: Array(21).fill('tag') })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('tooManyTags')
    })
  })

  describe('rate limiting → 429', () => {
    it('returns 429 with requestLimitReached when daily limit is reached', async () => {
      mockQueryOne.mockResolvedValueOnce({ count: '5' }) // COUNT of requests today >= 5

      const req = makeRequest({ title: 'Test', type: 'duo', content_level: 'none', status: 'active' })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(429)
      expect(data.error).toBe('requestLimitReached')
    })

    it('returns 429 with requestCooldown when last request was too recent', async () => {
      mockQueryOne.mockResolvedValueOnce({ count: '1' }) // count check passes (< 5)
      mockQueryOne.mockResolvedValueOnce({ created_at: new Date().toISOString() }) // last request was just now

      const req = makeRequest({ title: 'Test', type: 'duo', content_level: 'none', status: 'active' })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(429)
      expect(data.error).toBe('requestCooldown')
    })
  })

  describe('duplicate detection → 409', () => {
    it('returns 409 with duplicateRequest when a similar request exists', async () => {
      mockQueryOne.mockResolvedValueOnce({ count: '1' }) // count check passes
      mockQueryOne.mockResolvedValueOnce({ created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() }) // 5 min ago (cooldown passes)
      mockQueryOne.mockResolvedValueOnce({ id: 'dup-id' }) // duplicate found

      const req = makeRequest({ title: 'Test', type: 'duo', content_level: 'none', status: 'active' })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(409)
      expect(data.error).toBe('duplicateRequest')
    })
  })

  describe('success → 201', () => {
    it('returns 201 with created request when all checks pass', async () => {
      mockWithTransaction.mockResolvedValue({
        id: 'new-id',
        title: 'Test',
        type: 'duo',
        content_level: 'none',
        fandom_type: 'original',
        pairing: 'any',
        tags: [],
        is_public: true,
        status: 'active',
        created_at: new Date().toISOString(),
      })

      const req = makeRequest({ title: 'Test', type: 'duo', content_level: 'none' })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.id).toBe('new-id')
    })
  })
})
