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

vi.mock('@/lib/stoplist', () => ({
  getActiveStopPhrases: vi.fn().mockResolvedValue([]),
  checkStopList: vi.fn().mockReturnValue(null),
  VIOLATION_THRESHOLD: 3,
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeBody: vi.fn((html: string) => html),
}))

vi.mock('@/lib/sse', () => ({
  notifyGame: vi.fn(),
}))

import { query, queryOne } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { getActiveStopPhrases, checkStopList } from '@/lib/stoplist'
import { POST } from '@/app/api/games/[id]/messages/route'

const mockQuery = vi.mocked(query)
const mockQueryOne = vi.mocked(queryOne)
const mockRequireUser = vi.mocked(requireUser)
const mockGetActiveStopPhrases = vi.mocked(getActiveStopPhrases)
const mockCheckStopList = vi.mocked(checkStopList)

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
  // Default: no stop phrases
  mockGetActiveStopPhrases.mockResolvedValue([])
  mockCheckStopList.mockReturnValue(null)
})

// ── Helpers ───────────────────────────────────────────────────────────────

const GAME_ID = 'game-uuid-123'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/games/${GAME_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/games/[id]/messages', () => {
  describe('authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockRequireUser.mockResolvedValueOnce({ error: 'unauthorized', user: null, banReason: null })

      const req = makeRequest({ content: 'hello', type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(401)
    })

    it('returns 403 when user is banned', async () => {
      mockRequireUser.mockResolvedValueOnce({ error: 'banned', user: null, banReason: null })

      const req = makeRequest({ content: 'hello', type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(403)
    })
  })

  describe('game moderation', () => {
    it('returns 403 gameFrozen when game is hidden by moderation', async () => {
      mockQueryOne.mockResolvedValueOnce({ moderation_status: 'hidden', status: 'active' })

      const req = makeRequest({ content: 'hello', type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.error).toBe('gameFrozen')
    })
  })

  describe('content validation', () => {
    it('returns 400 emptyMessage when content is whitespace only', async () => {
      mockQueryOne.mockResolvedValueOnce({ moderation_status: 'visible', status: 'active' })

      const req = makeRequest({ content: '   ', type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('emptyMessage')
    })

    it('returns 400 messageTooLong when content exceeds 200000 characters', async () => {
      mockQueryOne.mockResolvedValueOnce({ moderation_status: 'visible', status: 'active' })

      const req = makeRequest({ content: 'x'.repeat(200_001), type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('messageTooLong')
    })
  })

  describe('game status rules', () => {
    it('returns 403 gameFinished when posting IC in a preparing game', async () => {
      mockQueryOne.mockResolvedValueOnce({ moderation_status: 'visible', status: 'preparing' })

      const req = makeRequest({ content: 'hello world', type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.error).toBe('gameFinished')
    })

    it('allows OOC messages in a preparing game', async () => {
      mockQueryOne.mockResolvedValueOnce({ moderation_status: 'visible', status: 'preparing' }) // game
      mockQueryOne.mockResolvedValueOnce({ id: 'p-id', left_at: null }) // participant
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', content: 'ooc message' }) // INSERT
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', content: 'ooc message', nickname: 'Player' }) // full

      const req = makeRequest({ content: 'ooc message', type: 'ooc' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      expect(res.status).toBe(201)
    })
  })

  describe('stop list', () => {
    it('returns 422 stopListBlocked when message contains a banned phrase', async () => {
      mockQueryOne.mockResolvedValueOnce({ moderation_status: 'visible', status: 'active' }) // game
      mockGetActiveStopPhrases.mockResolvedValueOnce([{ id: 1, phrase: 'badword' }])
      mockCheckStopList.mockReturnValueOnce({ phraseId: 1, phrase: 'badword', context: 'contains badword' })
      mockQuery.mockResolvedValue([]) // INSERT stop_violation
      mockQueryOne.mockResolvedValueOnce({ cnt: '1' }) // count violations (< threshold)

      const req = makeRequest({ content: 'this contains badword', type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(422)
      expect(data.error).toBe('stopListBlocked')
    })
  })

  describe('participant check', () => {
    it('returns 403 notParticipant when user is not in the game', async () => {
      mockQueryOne.mockResolvedValueOnce({ moderation_status: 'visible', status: 'active' }) // game
      mockQueryOne.mockResolvedValueOnce(null) // participant not found

      const req = makeRequest({ content: 'hello', type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.error).toBe('notParticipant')
    })
  })

  describe('success', () => {
    it('returns 201 with message data on valid request', async () => {
      mockQueryOne.mockResolvedValueOnce({ moderation_status: 'visible', status: 'active' }) // game
      mockQueryOne.mockResolvedValueOnce({ id: 'p-id', left_at: null }) // participant
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', game_id: GAME_ID, participant_id: 'p-id', content: 'Hello world', type: 'ic' }) // INSERT
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', content: 'Hello world', nickname: 'Player', avatar_url: null, user_id: 'user-id', type: 'ic' }) // full

      const req = makeRequest({ content: 'Hello world', type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.id).toBe('msg-id')
      expect(data.content).toBe('Hello world')
    })
  })
})
