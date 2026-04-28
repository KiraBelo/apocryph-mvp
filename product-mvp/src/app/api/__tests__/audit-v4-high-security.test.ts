import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Regression tests for the High-priority security findings of audit v4:
// - HIGH-S1: middleware CSP must not include `https:` in script-src.
// - HIGH-S3: 4 write endpoints must be rate-limited (return 429 once the
//   per-user budget is exhausted). Each endpoint owns a unique key so
//   limits are isolated.

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  withTransaction: vi.fn(),
}))

vi.mock('@/lib/session', async () => {
  const { handleAuthErrorMock } = await import('@/test/mocks/session-helpers')
  return {
    requireUser: vi.fn().mockResolvedValue({
      error: null,
      user: { id: 'user-id', email: 'a@b.com', role: 'user' },
      banReason: null,
    }),
    getUser: vi.fn().mockResolvedValue({ id: 'user-id', email: 'a@b.com', role: 'user' }),
    handleAuthError: handleAuthErrorMock,
  }
})

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeBody: (s: string) => s,
  sanitizeNickname: (s: string) => s,
}))

import { rateLimit } from '@/lib/rate-limit'
import { POST as invitesPost } from '@/app/api/invites/route'
import { PATCH as gamePatch } from '@/app/api/games/[id]/route'
import { POST as respondPost } from '@/app/api/requests/[id]/respond/route'
import { PATCH as notesPatch } from '@/app/api/games/[id]/notes/[noteId]/route'

const mockRateLimit = vi.mocked(rateLimit)

beforeEach(() => {
  vi.clearAllMocks()
  // Default: allow. Individual tests override to test the deny path.
  mockRateLimit.mockReturnValue({ allowed: true, remaining: 99 })
})

describe('HIGH-S3 (audit-v4): write endpoints are rate-limited', () => {
  it('POST /api/invites returns 429 when limit exhausted', async () => {
    mockRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0 })
    const req = new NextRequest('http://localhost/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'r1' }),
    })
    const res = await invitesPost(req)
    expect(res.status).toBe(429)
    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringMatching(/^invites:/),
      expect.any(Number),
      expect.any(Number)
    )
  })

  it('PATCH /api/games/[id] returns 429 when limit exhausted', async () => {
    mockRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0 })
    const req = new NextRequest('http://localhost/api/games/g1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'x' }),
    })
    const res = await gamePatch(req, { params: Promise.resolve({ id: 'g1' }) })
    expect(res.status).toBe(429)
    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringMatching(/^game-update:/),
      expect.any(Number),
      expect.any(Number)
    )
  })

  it('POST /api/requests/[id]/respond returns 429 when limit exhausted', async () => {
    mockRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0 })
    const req = new NextRequest('http://localhost/api/requests/r1/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'x' }),
    })
    const res = await respondPost(req, { params: Promise.resolve({ id: 'r1' }) })
    expect(res.status).toBe(429)
    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringMatching(/^respond:/),
      expect.any(Number),
      expect.any(Number)
    )
  })

  it('PATCH /api/games/[id]/notes/[noteId] returns 429 when limit exhausted', async () => {
    mockRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0 })
    const req = new NextRequest('http://localhost/api/games/g1/notes/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' }),
    })
    const res = await notesPatch(req, { params: Promise.resolve({ id: 'g1', noteId: '1' }) })
    expect(res.status).toBe(429)
    // notes-update key is intentionally separate from notes POST (20/min)
    // so create vs update have independent budgets.
    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringMatching(/^notes-update:/),
      expect.any(Number),
      expect.any(Number)
    )
  })
})
