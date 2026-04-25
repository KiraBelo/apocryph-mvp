import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks (must be declared before imports) ────────────────────────────────

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
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
import { notifyGame } from '@/lib/sse'
import { getActiveStopPhrases, checkStopList } from '@/lib/stoplist'
import { POST, GET } from '@/app/api/games/[id]/messages/route'

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
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', content: 'Hello world', nickname: 'Player', avatar_url: null, participant_id: 'p-id', type: 'ic' }) // full

      const req = makeRequest({ content: 'Hello world', type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.id).toBe('msg-id')
      expect(data.content).toBe('Hello world')
    })
  })

  // ── Anonymity invariant (audit-v4 CRIT-1) ───────────────────────────────
  // Real user_id MUST NOT leak to other participants — this is the platform's
  // core anonymity guarantee. Use participant_id (per-game opaque) instead.
  // The DB rows MAY contain user_id (used server-side for filtering), but the
  // HTTP response and SSE payload must strip it.
  describe('anonymity (CRIT-1 regression)', () => {
    it('POST response does NOT contain user_id (even when DB row has it)', async () => {
      mockQueryOne.mockResolvedValueOnce({ moderation_status: 'visible', status: 'active' }) // game
      mockQueryOne.mockResolvedValueOnce({ id: 'p-id', left_at: null }) // participant
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', game_id: GAME_ID, participant_id: 'p-id', content: 'x', type: 'ic' }) // INSERT
      // Simulate real DB returning user_id (legacy SELECT m.*, gp.user_id)
      mockQueryOne.mockResolvedValueOnce({
        id: 'msg-id', content: 'x', nickname: 'P', avatar_url: null,
        participant_id: 'p-id', type: 'ic',
        user_id: 'real-secret-uid-AAAAA',
      }) // full

      const req = makeRequest({ content: 'x', type: 'ic' })
      const res = await POST(req, { params: Promise.resolve({ id: GAME_ID }) })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data).not.toHaveProperty('user_id')
      expect(data.participant_id).toBe('p-id')
    })

    it('SSE notification payload does NOT contain user_id (even when DB row has it)', async () => {
      mockQueryOne.mockResolvedValueOnce({ moderation_status: 'visible', status: 'active' }) // game
      mockQueryOne.mockResolvedValueOnce({ id: 'p-id', left_at: null }) // participant
      mockQueryOne.mockResolvedValueOnce({ id: 'msg-id', game_id: GAME_ID, participant_id: 'p-id', content: 'x', type: 'ic' }) // INSERT
      mockQueryOne.mockResolvedValueOnce({
        id: 'msg-id', content: 'x', nickname: 'P', avatar_url: null,
        participant_id: 'p-id', type: 'ic',
        user_id: 'real-secret-uid-BBBBB',
      })

      const req = makeRequest({ content: 'x', type: 'ic' })
      await POST(req, { params: Promise.resolve({ id: GAME_ID }) })

      const mockNotify = vi.mocked(notifyGame)
      expect(mockNotify).toHaveBeenCalledOnce()
      const sseData = mockNotify.mock.calls[0][1] as Record<string, unknown>
      expect(sseData).not.toHaveProperty('user_id')
      expect(sseData.participant_id).toBe('p-id')
    })
  })
})

// ── GET tests for anonymity (CRIT-1 regression) ─────────────────────────────
describe('GET /api/games/[id]/messages', () => {
  function makeGetRequest(): NextRequest {
    return new NextRequest(`http://localhost/api/games/${GAME_ID}/messages?type=ic`)
  }

  it('messages in pagination response do NOT contain user_id (even when DB row has it)', async () => {
    // requireParticipant uses queryOne to check participant — first queryOne call
    mockQueryOne.mockResolvedValueOnce({ id: 'p-id', left_at: null }) // requireParticipant
    mockQueryOne.mockResolvedValueOnce({ count: '1' }) // count
    // Simulate real DB returning user_id (legacy SELECT m.*, gp.user_id)
    mockQuery.mockResolvedValueOnce([
      {
        id: 'msg-1', participant_id: 'other-p-id', content: 'hi',
        nickname: 'Other', avatar_url: null, type: 'ic',
        created_at: '2026-04-01T00:00:00Z', edited_at: null,
        user_id: 'real-secret-uid-CCCCC',
      },
    ])

    const res = await GET(makeGetRequest(), { params: Promise.resolve({ id: GAME_ID }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.messages).toHaveLength(1)
    expect(data.messages[0]).not.toHaveProperty('user_id')
    expect(data.messages[0].participant_id).toBe('other-p-id')
  })
})
