import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks (must be declared before imports) ───────────────────────────────

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
    handleAuthError: handleAuthErrorMock,
  }
})

vi.mock('@/lib/sse', () => ({
  notifyGame: vi.fn(),
}))

import { withTransaction } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { POST as publishResponse } from '@/app/api/games/[id]/publish-response/route'
import { POST as submitToModeration } from '@/app/api/games/[id]/submit-to-moderation/route'

const mockWithTransaction = vi.mocked(withTransaction)
const mockRequireUser = vi.mocked(requireUser)

const GAME_ID = 'game-uuid-123'

// ── Helpers ───────────────────────────────────────────────────────────────

function makeReq(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams() {
  return { params: Promise.resolve({ id: GAME_ID }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireUser.mockResolvedValue({
    error: null,
    user: { id: 'user-id', email: 'a@b.com', role: 'user' },
    banReason: null,
  })
})

// ── POST /api/games/[id]/publish-response ─────────────────────────────────

describe('POST /api/games/[id]/publish-response', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockRequireUser.mockResolvedValueOnce({ error: 'unauthorized', user: null, banReason: null })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/publish-response`, { choice: 'decline' })
    const res = await publishResponse(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('unauthorized')
  })

  it('returns 400 for invalid choice', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // We need the route to parse the body first, but invalid choice is checked before transaction
    const req = makeReq(`http://localhost/api/games/${GAME_ID}/publish-response`, { choice: 'invalid_choice' })
    const res = await publishResponse(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('invalidData')
  })

  it('returns 403 when user is not a participant', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // 1. participant check - not found
    mockClient.query.mockResolvedValueOnce({ rows: [] })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/publish-response`, { choice: 'decline' })
    const res = await publishResponse(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.error).toBe('forbidden')
  })

  it('returns 400 when game is not active', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // 1. participant check - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p-id' }] })
    // 2. game status - not active
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'published' }] })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/publish-response`, { choice: 'decline' })
    const res = await publishResponse(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('invalidStatus')
  })

  it('returns 403 when partner has no consent', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // 1. participant check - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p-id' }] })
    // 2. game status - active
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'active' }] })
    // 3. partner consent - not found
    mockClient.query.mockResolvedValueOnce({ rows: [] })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/publish-response`, { choice: 'decline' })
    const res = await publishResponse(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.error).toBe('forbidden')
  })

  it('returns 200 with status active when choice is decline', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // 1. participant check - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p-id' }] })
    // 2. game status - active
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'active' }] })
    // 3. partner consent - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'consent-id' }] })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/publish-response`, { choice: 'decline' })
    const res = await publishResponse(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ ok: true, status: 'active' })
    // decline should not insert consent or update status
    expect(mockClient.query).toHaveBeenCalledTimes(3)
  })

  it('returns 200 with status preparing when choice is edit_first', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // 1. participant check - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p-id' }] })
    // 2. game status - active
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'active' }] })
    // 3. partner consent - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'consent-id' }] })
    // 4. INSERT consent
    mockClient.query.mockResolvedValueOnce({ rows: [] })
    // 5. UPDATE games status
    mockClient.query.mockResolvedValueOnce({ rows: [] })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/publish-response`, { choice: 'edit_first' })
    const res = await publishResponse(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ ok: true, status: 'preparing' })
    expect(mockClient.query).toHaveBeenCalledTimes(5)
  })

  it('returns 200 with status moderation when choice is publish_as_is', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // 1. participant check - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p-id' }] })
    // 2. game status - active
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'active' }] })
    // 3. partner consent - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'consent-id' }] })
    // 4. INSERT consent
    mockClient.query.mockResolvedValueOnce({ rows: [] })
    // 5. UPDATE games status
    mockClient.query.mockResolvedValueOnce({ rows: [] })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/publish-response`, { choice: 'publish_as_is' })
    const res = await publishResponse(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ ok: true, status: 'moderation' })
    expect(mockClient.query).toHaveBeenCalledTimes(5)
  })
})

// ── POST /api/games/[id]/submit-to-moderation ─────────────────────────────

describe('POST /api/games/[id]/submit-to-moderation', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockRequireUser.mockResolvedValueOnce({ error: 'unauthorized', user: null, banReason: null })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/submit-to-moderation`, {})
    const res = await submitToModeration(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toBe('unauthorized')
  })

  it('returns 403 when user is not a participant', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // 1. participant check - not found
    mockClient.query.mockResolvedValueOnce({ rows: [] })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/submit-to-moderation`, {})
    const res = await submitToModeration(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.error).toBe('forbidden')
  })

  it('returns 400 when game is not in preparing status', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // 1. participant check - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p-id' }] })
    // 2. game status - not preparing
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'active' }] })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/submit-to-moderation`, {})
    const res = await submitToModeration(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('invalidStatus')
  })

  it('returns 403 when not all participants have consented', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // 1. participant check - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p-id' }] })
    // 2. game status - preparing
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'preparing' }] })
    // 3. consent count - not all agreed
    mockClient.query.mockResolvedValueOnce({ rows: [{ total: '2', agreed: '1' }] })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/submit-to-moderation`, {})
    const res = await submitToModeration(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.error).toBe('forbidden')
  })

  it('returns 200 when all checks pass', async () => {
    const mockClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => unknown) => fn(mockClient))

    // 1. participant check - found
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p-id' }] })
    // 2. game status - preparing
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'preparing' }] })
    // 3. consent count - all agreed
    mockClient.query.mockResolvedValueOnce({ rows: [{ total: '2', agreed: '2' }] })
    // 4. UPDATE games status
    mockClient.query.mockResolvedValueOnce({ rows: [] })

    const req = makeReq(`http://localhost/api/games/${GAME_ID}/submit-to-moderation`, {})
    const res = await submitToModeration(req, makeParams())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(mockClient.query).toHaveBeenCalledTimes(4)
  })
})
