import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks (must be declared before imports) ────────────────────────────────

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  withTransaction: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  requireUser: vi.fn().mockResolvedValue({
    error: null,
    user: { id: 'user-id', email: 'a@b.com', role: 'user' },
    banReason: null,
  }),
  getUser: vi.fn().mockResolvedValue({ id: 'user-id', email: 'a@b.com', role: 'user' }),
}))

vi.mock('@/lib/sse', () => ({
  notifyGame: vi.fn(),
}))

import { withTransaction } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { notifyGame } from '@/lib/sse'
import { POST, DELETE } from '@/app/api/games/[id]/publish-consent/route'

const mockRequireUser = vi.mocked(requireUser)
const mockWithTransaction = vi.mocked(withTransaction)
const mockNotifyGame = vi.mocked(notifyGame)

// ── Setup ─────────────────────────────────────────────────────────────────

const mockClient = {
  query: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireUser.mockResolvedValue({
    error: null,
    user: { id: 'user-id', email: 'a@b.com', role: 'user' },
    banReason: null,
  })
  mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient))
})

// ── Helpers ───────────────────────────────────────────────────────────────

const GAME_ID = 'game-uuid-123'

function makePostReq() {
  return new NextRequest(`http://localhost/api/games/${GAME_ID}/publish-consent`, {
    method: 'POST',
  })
}

function makeDeleteReq() {
  return new NextRequest(`http://localhost/api/games/${GAME_ID}/publish-consent`, {
    method: 'DELETE',
  })
}

// ── Tests: POST ──────────────────────────────────────────────────────────

describe('POST /api/games/[id]/publish-consent', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockRequireUser.mockResolvedValueOnce({ error: 'unauthorized', user: null, banReason: null })

    const res = await POST(makePostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('unauthorized')
  })

  it('returns 403 when user is banned', async () => {
    mockRequireUser.mockResolvedValueOnce({ error: 'banned', user: null, banReason: null })

    const res = await POST(makePostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('banned')
  })

  it('returns 403 when user is not a participant', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] }) // no participant

    const res = await POST(makePostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('forbidden')
  })

  it('returns 400 invalidStatus when game is not active', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'participant-id' }] }) // participant
      .mockResolvedValueOnce({ rows: [{ status: 'finished' }] })   // game status

    const res = await POST(makePostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('invalidStatus')
  })

  it('returns 400 tooFewMessages when IC count < 20', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'participant-id' }] }) // participant
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] })     // game status
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })           // IC count

    const res = await POST(makePostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('tooFewMessages')
  })

  it('returns 200 when IC count is exactly 20 (boundary)', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'participant-id' }] }) // participant
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] })     // game status
      .mockResolvedValueOnce({ rows: [{ count: '20' }] })          // IC count = MIN_IC_POSTS
      .mockResolvedValueOnce({ rows: [] })                          // upsert consent

    const res = await POST(makePostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it('returns 200 with ok:true on happy path', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'participant-id' }] }) // participant
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] })     // game status
      .mockResolvedValueOnce({ rows: [{ count: '25' }] })          // IC count
      .mockResolvedValueOnce({ rows: [] })                          // upsert consent

    const res = await POST(makePostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockNotifyGame).toHaveBeenCalledWith(GAME_ID, { _type: 'publishRequest' })
  })
})

// ── Tests: DELETE ────────────────────────────────────────────────────────

describe('DELETE /api/games/[id]/publish-consent', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockRequireUser.mockResolvedValueOnce({ error: 'unauthorized', user: null, banReason: null })

    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('unauthorized')
  })

  it('returns 403 when user is not a participant', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] }) // no participant

    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('forbidden')
  })

  it('returns 403 when user is banned', async () => {
    mockRequireUser.mockResolvedValueOnce({ error: 'banned', user: null, banReason: null })

    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('banned')
  })

  it('returns 200 and only deletes own consent when game is active', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'participant-id' }] }) // participant
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] })     // game status
      .mockResolvedValueOnce({ rows: [] })                          // delete own consent

    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockClient.query).toHaveBeenCalledTimes(3)
    expect(mockNotifyGame).toHaveBeenCalledWith(GAME_ID, { _type: 'publishRevoked' })
  })

  it('returns 200 and reverts to active when game is in moderation', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'participant-id' }] }) // participant
      .mockResolvedValueOnce({ rows: [{ status: 'moderation' }] }) // game status
      .mockResolvedValueOnce({ rows: [] })                          // delete own consent
      .mockResolvedValueOnce({ rows: [] })                          // UPDATE games SET status='active'
      .mockResolvedValueOnce({ rows: [] })                          // DELETE all consents

    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockClient.query).toHaveBeenCalledTimes(5)
    expect(mockNotifyGame).toHaveBeenCalledWith(GAME_ID, { _type: 'publishRevoked' })
  })

  it('returns 200 and reverts to active when game is preparing', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'participant-id' }] }) // participant
      .mockResolvedValueOnce({ rows: [{ status: 'preparing' }] })  // game status
      .mockResolvedValueOnce({ rows: [] })                          // delete own consent
      .mockResolvedValueOnce({ rows: [] })                          // UPDATE games SET status='active'
      .mockResolvedValueOnce({ rows: [] })                          // DELETE all consents

    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockClient.query).toHaveBeenCalledTimes(5)
    expect(mockNotifyGame).toHaveBeenCalledWith(GAME_ID, { _type: 'publishRevoked' })
  })

  it('returns 200, reverts to active and deletes likes when game is published', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'participant-id' }] }) // participant
      .mockResolvedValueOnce({ rows: [{ status: 'published' }] })  // game status
      .mockResolvedValueOnce({ rows: [] })                          // delete own consent
      .mockResolvedValueOnce({ rows: [] })                          // UPDATE games SET status='active'
      .mockResolvedValueOnce({ rows: [] })                          // DELETE all consents
      .mockResolvedValueOnce({ rows: [] })                          // DELETE game_likes

    const res = await DELETE(makeDeleteReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockClient.query).toHaveBeenCalledTimes(6)
    expect(mockNotifyGame).toHaveBeenCalledWith(GAME_ID, { _type: 'publishRevoked' })
  })
})
