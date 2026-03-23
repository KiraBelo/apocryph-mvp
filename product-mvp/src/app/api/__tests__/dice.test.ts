import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks (must be declared before imports) ────────────────────────────────

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  requireUser: vi.fn().mockResolvedValue({
    error: null,
    user: { id: 'user-id', email: 'a@b.com', role: 'user' },
    banReason: null,
  }),
  handleAuthError: (error: string | null) => {
    const { NextResponse } = require('next/server')
    if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
    if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })
    if (error === 'forbidden') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return null
  },
}))

vi.mock('@/lib/auth', () => ({
  requireParticipant: vi.fn(),
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeNickname: vi.fn((name: string) => name),
}))

vi.mock('@/lib/sse', () => ({
  notifyGame: vi.fn(),
}))

import { queryOne } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { requireParticipant } from '@/lib/auth'
import { POST } from '@/app/api/games/[id]/dice/route'

const mockQueryOne = vi.mocked(queryOne)
const mockRequireUser = vi.mocked(requireUser)
const mockRequireParticipant = vi.mocked(requireParticipant)

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  const g = globalThis as unknown as { __rateLimitStore?: Map<string, unknown> }
  g.__rateLimitStore?.clear()
  vi.clearAllMocks()
  // Default: user authenticated
  mockRequireUser.mockResolvedValue({
    error: null,
    user: { id: 'user-id', email: 'a@b.com', role: 'user' },
    banReason: null,
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────

const GAME_ID = 'game-uuid-123'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/games/${GAME_ID}/dice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeBadRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/games/${GAME_ID}/dice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json',
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/games/[id]/dice', () => {
  describe('authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockRequireUser.mockResolvedValueOnce({ error: 'unauthorized', user: null, banReason: null })

      const req = makeRequest({ sides: 6 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('unauthorized')
    })

    it('returns 403 when user is banned', async () => {
      mockRequireUser.mockResolvedValueOnce({ error: 'banned', user: null, banReason: null })

      const req = makeRequest({ sides: 6 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('banned')
    })
  })

  describe('rate limiting', () => {
    it('returns 429 when rate limited', async () => {
      // Exhaust rate limit: 10 allowed per window
      for (let i = 0; i < 10; i++) {
        mockQueryOne.mockResolvedValueOnce({ status: 'active' }) // game
        mockRequireParticipant.mockResolvedValueOnce({ id: 'p-id', nickname: 'Player', left_at: null } as never)
        mockQueryOne.mockResolvedValueOnce({ id: 'msg-id' }) // INSERT message
        mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', nickname: 'Player' }) // full message

        const req = makeRequest({ sides: 6 })
        await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      }

      const req = makeRequest({ sides: 6 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(429)
      const data = await res.json()
      expect(data.error).toBe('errors.tooManyRequests')
    })
  })

  describe('body validation', () => {
    it('returns 400 when JSON body is invalid', async () => {
      const req = makeBadRequest()
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('errors.invalidBody')
    })

    it('returns 400 when sides is not an integer', async () => {
      const req = makeRequest({ sides: 2.5 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('invalidDice')
    })

    it('returns 400 when sides is less than 2', async () => {
      const req = makeRequest({ sides: 1 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('invalidDice')
    })

    it('returns 400 when sides is greater than 100', async () => {
      const req = makeRequest({ sides: 101 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('invalidDice')
    })

    it('returns 400 when sides is missing', async () => {
      const req = makeRequest({})
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('invalidDice')
    })
  })

  describe('game checks', () => {
    it('returns 404 when game not found', async () => {
      mockQueryOne.mockResolvedValueOnce(null) // game not found

      const req = makeRequest({ sides: 6 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('notFound')
    })

    it('returns 403 when game is not active', async () => {
      mockQueryOne.mockResolvedValueOnce({ status: 'preparing' })

      const req = makeRequest({ sides: 6 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('gameNotActive')
    })

    it('returns 403 when game status is published', async () => {
      mockQueryOne.mockResolvedValueOnce({ status: 'published' })

      const req = makeRequest({ sides: 6 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('gameNotActive')
    })
  })

  describe('participant checks', () => {
    it('returns 403 when user is not a participant', async () => {
      mockQueryOne.mockResolvedValueOnce({ status: 'active' }) // game
      mockRequireParticipant.mockResolvedValueOnce(null) // not a participant

      const req = makeRequest({ sides: 6 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('notParticipant')
    })
  })

  describe('success', () => {
    it('returns 201 with dice result on valid request', async () => {
      mockQueryOne.mockResolvedValueOnce({ status: 'active' }) // game
      mockRequireParticipant.mockResolvedValueOnce({
        id: 'p-id', nickname: 'Player', left_at: null,
      } as never)
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', content: '{}' }) // INSERT message
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', nickname: 'Player' }) // full message

      const req = makeRequest({ sides: 6 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.sides).toBe(6)
      expect(data.result).toBeGreaterThanOrEqual(1)
      expect(data.result).toBeLessThanOrEqual(6)
      expect(data.roller).toBe('Player')
    })

    it('returns result within valid range for d20', async () => {
      mockQueryOne.mockResolvedValueOnce({ status: 'active' }) // game
      mockRequireParticipant.mockResolvedValueOnce({
        id: 'p-id', nickname: 'Roller', left_at: null,
      } as never)
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', content: '{}' }) // INSERT message
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', nickname: 'Roller' }) // full message

      const req = makeRequest({ sides: 20 })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.sides).toBe(20)
      expect(data.result).toBeGreaterThanOrEqual(1)
      expect(data.result).toBeLessThanOrEqual(20)
      expect(data.roller).toBe('Roller')
    })
  })
})
