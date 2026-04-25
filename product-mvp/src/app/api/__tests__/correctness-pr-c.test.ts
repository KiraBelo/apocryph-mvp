import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { PoolClient } from 'pg'

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
    requireMod: vi.fn().mockResolvedValue({
      error: null,
      user: { id: 'mod-id', email: 'm@b.com', role: 'admin' },
    }),
    getSession: vi.fn().mockResolvedValue({
      destroy: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    }),
    handleAuthError: handleAuthErrorMock,
  }
})

vi.mock('@/lib/sse', () => ({
  notifyGame: vi.fn(),
}))

import { queryOne, withTransaction } from '@/lib/db'
import { DELETE as deleteAdminComment } from '@/app/api/admin/comments/[id]/route'
import { POST as logout } from '@/app/api/auth/logout/route'
import { POST as submitToModeration } from '@/app/api/games/[id]/submit-to-moderation/route'
import { PATCH as patchRequest } from '@/app/api/requests/[id]/route'

const mockQueryOne = vi.mocked(queryOne)
const mockWithTransaction = vi.mocked(withTransaction)

const mockClient = { query: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.query.mockReset()
  mockWithTransaction.mockImplementation(async (fn) => fn(mockClient as unknown as PoolClient))
})

// CRIT-3 (audit-v4): DELETE of a non-existent row must return 404, not 200.
describe('DELETE /api/admin/comments/[id] (CRIT-3 regression)', () => {
  it('returns 404 when comment does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null) // DELETE ... RETURNING returns nothing
    const req = new NextRequest('http://localhost/api/admin/comments/missing', { method: 'DELETE' })
    const res = await deleteAdminComment(req, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('notFound')
  })

  it('returns 200 when comment was deleted', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 'c1' })
    const req = new NextRequest('http://localhost/api/admin/comments/c1', { method: 'DELETE' })
    const res = await deleteAdminComment(req, { params: Promise.resolve({ id: 'c1' }) })
    expect(res.status).toBe(200)
  })
})

// CRIT-4 (audit-v4): logout must redirect using the request's host, not a
// hard-coded localhost fallback.
describe('POST /api/auth/logout (CRIT-4 regression)', () => {
  it('redirects to "/" on the request host', async () => {
    const req = new NextRequest('https://apocryph.example.com/api/auth/logout', { method: 'POST' })
    const res = await logout(req)
    expect(res.status).toBe(307) // Next.js redirect
    const location = res.headers.get('location') ?? ''
    expect(location).toBe('https://apocryph.example.com/')
    expect(location).not.toContain('localhost')
  })
})

// CRIT-6 (audit-v4, variant A): consent must be required from ALL participants
// who were ever in the game, including those who left. Otherwise a player
// remaining after a partner walks away can publish without their permission.
describe('POST /api/games/[id]/submit-to-moderation (CRIT-6 regression)', () => {
  function setupConsent({ totalIncludingLeft, agreed }: { totalIncludingLeft: number; agreed: number }) {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'p-mine' }] })            // me
      .mockResolvedValueOnce({ rows: [{ status: 'preparing' }] })     // game
      .mockResolvedValueOnce({                                          // consent count
        rows: [{ total: String(totalIncludingLeft), agreed: String(agreed) }],
      })
      .mockResolvedValueOnce({ rows: [] })                              // UPDATE games (only on success path)
  }

  it('forbids submit when a left participant never consented', async () => {
    // 2 participants total (1 active + 1 left), only the active one consented
    setupConsent({ totalIncludingLeft: 2, agreed: 1 })
    const req = new NextRequest('http://localhost/api/games/g1/submit-to-moderation', { method: 'POST' })
    const res = await submitToModeration(req, { params: Promise.resolve({ id: 'g1' }) })
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('forbidden')
  })

  it('allows submit when every participant — including left ones — consented', async () => {
    setupConsent({ totalIncludingLeft: 2, agreed: 2 })
    const req = new NextRequest('http://localhost/api/games/g1/submit-to-moderation', { method: 'POST' })
    const res = await submitToModeration(req, { params: Promise.resolve({ id: 'g1' }) })
    expect(res.status).toBe(200)
  })
})

// CRIT-8 (audit-v4): fuzzy duplicate detection must run on PATCH status=active
// too, otherwise the user can bypass it by creating drafts and activating
// them one by one.
describe('PATCH /api/requests/[id] activate-draft (CRIT-8 regression)', () => {
  beforeEach(() => {
    // Force production-like behaviour so anti-spam runs (it short-circuits
    // in development).
    vi.stubEnv('NODE_ENV', 'production')
  })

  it('returns 409 duplicateRequest when activating a draft similar to a recent active request', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ author_id: 'user-id' })                  // ownership
      .mockResolvedValueOnce({ count: '0' })                            // recentCount under limit
      .mockResolvedValueOnce(null)                                      // no recent cooldown
      .mockResolvedValueOnce({ title: 'My story', body: 'long body' })  // current row
      .mockResolvedValueOnce({ id: 'dup-id' })                          // similarity hit

    const req = new NextRequest('http://localhost/api/requests/draft-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    const res = await patchRequest(req, { params: Promise.resolve({ id: 'draft-id' }) })
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBe('duplicateRequest')
  })

  it('activates the draft when no similar recent request exists', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ author_id: 'user-id' })                  // ownership
      .mockResolvedValueOnce({ count: '0' })                            // recentCount
      .mockResolvedValueOnce(null)                                      // no recent
      .mockResolvedValueOnce({ title: 'Unique story', body: null })     // current row
      .mockResolvedValueOnce(null)                                      // no duplicate
      .mockResolvedValueOnce({ id: 'draft-id', status: 'active' })      // UPDATE returning

    const req = new NextRequest('http://localhost/api/requests/draft-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    const res = await patchRequest(req, { params: Promise.resolve({ id: 'draft-id' }) })
    expect(res.status).toBe(200)
  })
})
