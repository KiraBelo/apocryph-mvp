import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Regression tests for the High-priority correctness findings of audit v4:
// - HIGH-F1: see admin-moderate.test.ts (reject clears published_at).
// - HIGH-F2: parent_id in /public-games/[id]/comments must be validated before
//   it reaches Postgres. Invalid UUID strings used to crash with a 500 server
//   error; non-existent IDs used to violate the FK and crash the same way.

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
  rateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfter: 0 }),
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeBody: (s: string) => s,
}))

import { queryOne } from '@/lib/db'
import { POST as postComment } from '@/app/api/public-games/[id]/comments/route'

const mockQueryOne = vi.mocked(queryOne)

const GAME_ID = '11111111-1111-1111-1111-111111111111'
const VALID_UUID = '22222222-2222-2222-2222-222222222222'

function makeReq(body: unknown) {
  return new NextRequest(`http://localhost/api/public-games/${GAME_ID}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/public-games/[id]/comments — parent_id validation (HIGH-F2 regression)', () => {
  it('returns 400 when parent_id is not a valid UUID', async () => {
    // Game must exist and user must be a participant for the parent_id branch
    // to be reached. We never get there, but mock the basics so an unrelated
    // failure cannot mask the test.
    mockQueryOne.mockResolvedValue({ id: GAME_ID }) // catch-all (will be short-circuited)

    const res = await postComment(makeReq({ content: 'hi', parent_id: 'not-a-uuid' }), {
      params: Promise.resolve({ id: GAME_ID }),
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('errors.invalidBody')
  })

  it('returns 404 when parent_id is a valid UUID but the comment does not exist in this game', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: GAME_ID })   // game exists & published
      .mockResolvedValueOnce({ id: 'p-1' })      // user is a game author (allowed to reply)
      .mockResolvedValueOnce(null)               // parent comment lookup → not found

    const res = await postComment(makeReq({ content: 'hi', parent_id: VALID_UUID }), {
      params: Promise.resolve({ id: GAME_ID }),
    })

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('notFound')
  })

  it('still inserts when parent_id is null (top-level comment)', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: GAME_ID }) // game exists
      .mockResolvedValueOnce({ id: 'new' })    // INSERT returning

    const res = await postComment(makeReq({ content: 'hi' }), {
      params: Promise.resolve({ id: GAME_ID }),
    })

    expect(res.status).toBe(200)
  })
})
