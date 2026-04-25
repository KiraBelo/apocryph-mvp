import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}))

vi.mock('@/lib/session', async () => {
  const { handleAuthErrorMock } = await import('@/test/mocks/session-helpers')
  return {
    getUser: vi.fn().mockResolvedValue({ id: 'me-uid', email: 'me@x', role: 'user' }),
    requireUser: vi.fn(),
    handleAuthError: handleAuthErrorMock,
  }
})

vi.mock('@/lib/auth', () => ({
  requireParticipant: vi.fn(),
}))

import { query, queryOne } from '@/lib/db'
import { GET } from '@/app/api/games/[id]/route'

const mockQuery = vi.mocked(query)
const mockQueryOne = vi.mocked(queryOne)

beforeEach(() => {
  vi.clearAllMocks()
})

const GAME_ID = 'game-uuid'

function makeReq(): NextRequest {
  return new NextRequest(`http://localhost/api/games/${GAME_ID}`)
}

// CRIT-1 (audit-v4): the per-game opaque participant_id is fine to share, but
// the real user_id must NEVER leak to other participants — that's what makes
// cross-game deanonymization possible.
describe('GET /api/games/[id] — anonymity (CRIT-1 regression)', () => {
  it('strips user_id from participants for non-moderators', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: GAME_ID, request_title: 'T', request_type: 'duo' }) // game
    mockQuery.mockResolvedValueOnce([
      { id: 'p1', game_id: GAME_ID, user_id: 'me-uid', nickname: 'Me', avatar_url: null,
        banner_url: null, banner_pref: 'own', left_at: null, leave_reason: null },
      { id: 'p2', game_id: GAME_ID, user_id: 'partner-secret-uid', nickname: 'Partner', avatar_url: null,
        banner_url: null, banner_pref: 'own', left_at: null, leave_reason: null },
    ])

    const res = await GET(makeReq(), { params: Promise.resolve({ id: GAME_ID }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.participants).toHaveLength(2)
    for (const p of data.participants) {
      expect(p).not.toHaveProperty('user_id')
    }
    const serialized = JSON.stringify(data.participants)
    expect(serialized).not.toContain('partner-secret-uid')
    expect(serialized).not.toContain('me-uid')
  })

  it('keeps user_id on participants for moderators (legitimate access)', async () => {
    const { getUser } = await import('@/lib/session')
    vi.mocked(getUser).mockResolvedValueOnce({ id: 'mod-uid', email: 'mod@x', role: 'moderator' })

    mockQueryOne.mockResolvedValueOnce({ id: GAME_ID, request_title: 'T', request_type: 'duo' })
    mockQuery.mockResolvedValueOnce([
      { id: 'p1', game_id: GAME_ID, user_id: 'real-uid-1', nickname: 'A', avatar_url: null,
        banner_url: null, banner_pref: 'own', left_at: null, leave_reason: null, user_email: 'a@x' },
    ])

    const res = await GET(makeReq(), { params: Promise.resolve({ id: GAME_ID }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.participants[0]).toHaveProperty('user_id', 'real-uid-1')
    expect(data.isMod).toBe(true)
  })
})
