// GOLD STANDARD: Vitest Test File (NOT Jest)
// Based on: src/app/api/__tests__/publish-consent.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// 1. Mocks BEFORE imports — vi.mock is hoisted but declare order matters for clarity
vi.mock('@/lib/db', () => ({
  query: vi.fn(), queryOne: vi.fn(), withTransaction: vi.fn(),
}))
vi.mock('@/lib/session', () => ({
  requireUser: vi.fn().mockResolvedValue({ error: null, user: { id: 'uid', email: 'a@b.com', role: 'user' }, banReason: null }),
  requireMod: vi.fn().mockResolvedValue({ error: null, user: { id: 'uid', email: 'a@b.com', role: 'admin' } }),
  getUser: vi.fn().mockResolvedValue({ id: 'uid', email: 'a@b.com', role: 'user' }),
  getSession: vi.fn().mockResolvedValue({ userId: 'uid', save: vi.fn() }),
}))

import { withTransaction } from '@/lib/db'
import { requireUser } from '@/lib/session'
// import { POST } from '@/app/api/your-route/route'

const mockRequireUser = vi.mocked(requireUser)
const mockWithTransaction = vi.mocked(withTransaction)

const mockClient = { query: vi.fn() }

// 2. clearAllMocks in beforeEach — reset state between tests
beforeEach(() => {
  vi.clearAllMocks()
  mockRequireUser.mockResolvedValue({ error: null, user: { id: 'uid', email: 'a@b.com', role: 'user' }, banReason: null })
  mockWithTransaction.mockImplementation(async (fn: (c: typeof mockClient) => Promise<unknown>) => fn(mockClient))
})

// 3. Use valid GameStatus values — 'finished' does NOT exist
// Valid: 'active' | 'preparing' | 'moderation' | 'published'
describe('POST /api/example', () => {
  it('returns 401 when not authenticated', async () => {
    mockRequireUser.mockResolvedValueOnce({ error: 'unauthorized', user: null, banReason: null })
    // const res = await POST(req, params)
    // expect(res.status).toBe(401)
  })

  it('returns 400 for invalid status', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'pid' }] })       // participant check
      .mockResolvedValueOnce({ rows: [{ status: 'published' }] }) // game status (use valid status!)
    // const res = await POST(req, params)
    // expect(res.status).toBe(400)
  })
})
