import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks (must be declared before imports) ────────────────────────────────

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
      user: { id: 'user-id', email: 'a@b.com', role: 'admin' },
      banReason: null,
    }),
    requireMod: vi.fn().mockResolvedValue({
      error: null,
      user: { id: 'user-id', email: 'a@b.com', role: 'admin' },
    }),
    getUser: vi.fn().mockResolvedValue({ id: 'user-id', email: 'a@b.com', role: 'user' }),
    getSession: vi.fn().mockResolvedValue({ userId: 'user-id', email: 'a@b.com', role: 'user', save: vi.fn() }),
    handleAuthError: handleAuthErrorMock,
  }
})

vi.mock('@/lib/sse', () => ({
  notifyGame: vi.fn(),
}))

import { queryOne, withTransaction } from '@/lib/db'
import { requireUser, requireMod, getUser } from '@/lib/session'
import { notifyGame } from '@/lib/sse'
import { POST as moderateGame } from '@/app/api/admin/games/[id]/moderate/route'
import { GET as getLikes, POST as toggleLike } from '@/app/api/public-games/[id]/likes/route'

const mockRequireUser = vi.mocked(requireUser)
const mockRequireMod = vi.mocked(requireMod)
const mockGetUser = vi.mocked(getUser)
const mockWithTransaction = vi.mocked(withTransaction)
const mockQueryOne = vi.mocked(queryOne)
const mockNotifyGame = vi.mocked(notifyGame)

// ── Setup ─────────────────────────────────────────────────────────────────

const mockClient = {
  query: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireMod.mockResolvedValue({
    error: null,
    user: { id: 'user-id', email: 'a@b.com', role: 'admin' },
  })
  mockRequireUser.mockResolvedValue({
    error: null,
    user: { id: 'user-id', email: 'a@b.com', role: 'admin' },
    banReason: null,
  })
  mockGetUser.mockResolvedValue({ id: 'user-id', email: 'a@b.com', role: 'user' })
  mockWithTransaction.mockImplementation(async (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient))
})

// ── Helpers ───────────────────────────────────────────────────────────────

const GAME_ID = 'game-uuid-123'

function makeModerateReq(action: string) {
  return new NextRequest(`http://localhost/api/admin/games/${GAME_ID}/moderate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
}

function makeLikesGetReq() {
  return new NextRequest(`http://localhost/api/public-games/${GAME_ID}/likes`)
}

function makeLikesPostReq() {
  return new NextRequest(`http://localhost/api/public-games/${GAME_ID}/likes`, {
    method: 'POST',
  })
}

// ── Tests: POST /api/admin/games/[id]/moderate ────────────────────────────

describe('POST /api/admin/games/[id]/moderate', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockRequireMod.mockResolvedValueOnce({ error: 'unauthorized', user: null })

    const res = await moderateGame(makeModerateReq('approve'), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('unauthorized')
  })

  it('returns 403 when user is banned', async () => {
    mockRequireMod.mockResolvedValueOnce({ error: 'banned', user: null })

    const res = await moderateGame(makeModerateReq('approve'), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('banned')
  })

  it('returns 403 when user role is not admin or moderator', async () => {
    mockRequireMod.mockResolvedValueOnce({ error: 'forbidden', user: null })

    const res = await moderateGame(makeModerateReq('approve'), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('forbidden')
  })

  it('allows moderator role to approve', async () => {
    mockRequireMod.mockResolvedValueOnce({
      error: null,
      user: { id: 'user-id', email: 'a@b.com', role: 'moderator' },
    })
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ status: 'moderation' }] }) // game status
      .mockResolvedValueOnce({ rows: [] })                          // UPDATE status='published'

    const res = await moderateGame(makeModerateReq('approve'), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('published')
  })

  it('returns 400 for invalid action', async () => {
    const res = await moderateGame(makeModerateReq('publish'), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('invalidData')
  })

  it('returns 400 when game is not in moderation status', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'active' }] }) // game status

    const res = await moderateGame(makeModerateReq('approve'), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('invalidStatus')
  })

  it('returns 200 and publishes game on approve', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ status: 'moderation' }] }) // game status
      .mockResolvedValueOnce({ rows: [] })                          // UPDATE status='published'

    const res = await moderateGame(makeModerateReq('approve'), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.status).toBe('published')
    expect(mockNotifyGame).toHaveBeenCalledWith(GAME_ID, { _type: 'statusChanged', status: 'published' })
  })

  it('returns 200 and reverts game to active on reject', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ status: 'moderation' }] }) // game status
      .mockResolvedValueOnce({ rows: [] })                          // UPDATE status='active'
      .mockResolvedValueOnce({ rows: [] })                          // DELETE consent

    const res = await moderateGame(makeModerateReq('reject'), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.status).toBe('active')
    expect(mockClient.query).toHaveBeenCalledTimes(3)
    expect(mockNotifyGame).toHaveBeenCalledWith(GAME_ID, { _type: 'statusChanged', status: 'active' })
  })
})

// ── Tests: GET /api/public-games/[id]/likes ───────────────────────────────

describe('GET /api/public-games/[id]/likes', () => {
  it('returns 404 when game is not published', async () => {
    mockQueryOne.mockResolvedValueOnce(null) // game not found / not published

    const res = await getLikes(makeLikesGetReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('notFound')
  })

  it('returns count and liked=false when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce(null)
    mockQueryOne
      .mockResolvedValueOnce({ status: 'published' }) // game exists
      .mockResolvedValueOnce({ count: '5' })           // like count

    const res = await getLikes(makeLikesGetReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.count).toBe(5)
    expect(data.liked).toBe(false)
  })

  it('returns count and liked=true when user has liked the game', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ status: 'published' }) // game exists
      .mockResolvedValueOnce({ count: '5' })           // like count
      .mockResolvedValueOnce({ id: 'like-id' })        // user's like exists

    const res = await getLikes(makeLikesGetReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.count).toBe(5)
    expect(data.liked).toBe(true)
  })
})

// ── Tests: POST /api/public-games/[id]/likes ──────────────────────────────

describe('POST /api/public-games/[id]/likes', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce(null)

    const res = await toggleLike(makeLikesPostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('unauthorized')
  })

  it('returns 404 when game is not published', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] }) // game not found

    const res = await toggleLike(makeLikesPostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('notFound')
  })

  it('returns 200 and adds like when not existing', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: GAME_ID }] }) // game exists
      .mockResolvedValueOnce({ rows: [] })                  // no existing like
      .mockResolvedValueOnce({ rows: [] })                  // INSERT like
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })   // new count

    const res = await toggleLike(makeLikesPostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.liked).toBe(true)
    expect(data.count).toBe(1)
  })

  it('returns 200 and removes like when existing', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: GAME_ID }] })  // game exists
      .mockResolvedValueOnce({ rows: [{ id: 'like-id' }] }) // existing like
      .mockResolvedValueOnce({ rows: [] })                   // DELETE like
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })    // new count

    const res = await toggleLike(makeLikesPostReq(), { params: Promise.resolve({ id: GAME_ID }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.liked).toBe(false)
    expect(data.count).toBe(0)
  })
})
