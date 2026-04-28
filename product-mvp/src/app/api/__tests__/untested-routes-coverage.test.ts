import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Closes audit-v4 coverage gaps for /leave, /report, /unread-count.
// Also pins the new single-query shape of /admin/reports
// (`COUNT(*) OVER()` instead of two roundtrips).

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
    getUser: vi.fn().mockResolvedValue({ id: 'user-id', email: 'a@b.com', role: 'user' }),
    handleAuthError: handleAuthErrorMock,
  }
})

vi.mock('@/lib/auth', () => ({
  requireParticipant: vi.fn(),
  isModerator: (u: { role?: string } | null | undefined) =>
    !!u && (u.role === 'moderator' || u.role === 'admin'),
}))

vi.mock('@/lib/sse', () => ({
  notifyGame: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 99 }),
}))

import { query, queryOne } from '@/lib/db'
import { requireParticipant } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { notifyGame } from '@/lib/sse'
import { POST as leavePost } from '@/app/api/games/[id]/leave/route'
import { POST as reportPost } from '@/app/api/games/[id]/report/route'
import { GET as unreadGet } from '@/app/api/games/unread-count/route'
import { GET as adminReportsGet } from '@/app/api/admin/reports/route'

const mockQuery = vi.mocked(query)
const mockQueryOne = vi.mocked(queryOne)
const mockRequireParticipant = vi.mocked(requireParticipant)
const mockRateLimit = vi.mocked(rateLimit)
const mockNotifyGame = vi.mocked(notifyGame)

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockReturnValue({ allowed: true, remaining: 99 })
})

const GAME_ID = 'game-1'

// ── /leave ────────────────────────────────────────────────────────────────

describe('POST /api/games/[id]/leave', () => {
  function makeReq(body: unknown) {
    return new NextRequest(`http://localhost/api/games/${GAME_ID}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns 400 when reason is missing', async () => {
    const res = await leavePost(makeReq({}), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('selectLeaveReason')
  })

  it('returns 400 when reason is too long (>500 chars)', async () => {
    const res = await leavePost(makeReq({ reason: 'x'.repeat(501) }), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('leaveTooLong')
  })

  it('returns 403 when user is not a participant', async () => {
    mockRequireParticipant.mockResolvedValueOnce(null)
    const res = await leavePost(makeReq({ reason: 'no longer interested' }), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('notParticipant')
  })

  it('returns 400 when participant has already left', async () => {
    mockRequireParticipant.mockResolvedValueOnce({
      id: 'p1', game_id: GAME_ID, user_id: 'user-id', nickname: 'x',
      avatar_url: null, banner_url: null, banner_pref: 'none',
      left_at: '2026-01-01', leave_reason: 'old',
    })
    const res = await leavePost(makeReq({ reason: 'changed mind' }), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('alreadyLeft')
  })

  it('updates left_at + leave_reason and notifies SSE on success', async () => {
    mockRequireParticipant.mockResolvedValueOnce({
      id: 'p1', game_id: GAME_ID, user_id: 'user-id', nickname: 'x',
      avatar_url: null, banner_url: null, banner_pref: 'none',
      left_at: null, leave_reason: null,
    })
    mockQuery.mockResolvedValue([])

    const res = await leavePost(makeReq({ reason: 'ushel' }), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(200)
    const updateCall = mockQuery.mock.calls[0]?.[0] as string
    expect(updateCall).toMatch(/UPDATE\s+game_participants/i)
    expect(updateCall).toMatch(/left_at\s*=\s*NOW\(\)/i)
    expect(mockNotifyGame).toHaveBeenCalledWith(GAME_ID, expect.objectContaining({ _type: 'participantLeft' }))
  })
})

// ── /report ───────────────────────────────────────────────────────────────

describe('POST /api/games/[id]/report', () => {
  function makeReq(body: unknown) {
    return new NextRequest(`http://localhost/api/games/${GAME_ID}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns 429 when rate-limited', async () => {
    mockRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0 })
    const res = await reportPost(makeReq({ reason: 'spam' }), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(429)
  })

  it('returns 400 when reason is too long (>2000 chars)', async () => {
    const res = await reportPost(makeReq({ reason: 'x'.repeat(2001) }), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('reportTooLong')
  })

  it('returns 403 when user is not a participant', async () => {
    mockRequireParticipant.mockResolvedValueOnce(null)
    const res = await reportPost(makeReq({ reason: 'spam' }), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('notParticipant')
  })

  it('returns 409 on duplicate pending report from same reporter', async () => {
    mockRequireParticipant.mockResolvedValueOnce({
      id: 'p1', game_id: GAME_ID, user_id: 'user-id', nickname: 'x',
      avatar_url: null, banner_url: null, banner_pref: 'none', left_at: null, leave_reason: null,
    })
    mockQueryOne.mockResolvedValueOnce({ id: 'existing-report' }) // existing

    const res = await reportPost(makeReq({ reason: 'spam' }), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('alreadyReported')
  })

  it('auto-hides game when 2+ distinct reporters threshold is crossed', async () => {
    mockRequireParticipant.mockResolvedValueOnce({
      id: 'p1', game_id: GAME_ID, user_id: 'user-id', nickname: 'x',
      avatar_url: null, banner_url: null, banner_pref: 'none', left_at: null, leave_reason: null,
    })
    mockQueryOne
      .mockResolvedValueOnce(null) // no existing report
      .mockResolvedValueOnce({ cnt: '2' }) // distinct reporters count

    const res = await reportPost(makeReq({ reason: 'creepy' }), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(200)

    // The auto-hide UPDATE must run when count >= 2.
    const updateGames = mockQuery.mock.calls.find(c => /UPDATE\s+games/i.test(c[0] as string))
    expect(updateGames).toBeDefined()
    expect(updateGames?.[0]).toMatch(/moderation_status\s*=\s*'hidden'/i)
  })

  it('does NOT auto-hide when only one reporter', async () => {
    mockRequireParticipant.mockResolvedValueOnce({
      id: 'p1', game_id: GAME_ID, user_id: 'user-id', nickname: 'x',
      avatar_url: null, banner_url: null, banner_pref: 'none', left_at: null, leave_reason: null,
    })
    mockQueryOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ cnt: '1' })

    const res = await reportPost(makeReq({ reason: 'meh' }), { params: Promise.resolve({ id: GAME_ID }) })
    expect(res.status).toBe(200)

    const updateGames = mockQuery.mock.calls.find(c => /UPDATE\s+games/i.test(c[0] as string))
    expect(updateGames).toBeUndefined()
  })
})

// ── /unread-count ─────────────────────────────────────────────────────────

describe('GET /api/games/unread-count', () => {
  it('returns zeroed payload for anonymous users (no DB hit)', async () => {
    const session = await import('@/lib/session')
    vi.mocked(session.getUser).mockResolvedValueOnce(null)
    const res = await unreadGet()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ count: 0, ic_count: 0, ooc_count: 0, games: [], proposals: [] })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('returns split ic_count and ooc_count based on per-game unread types', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { id: 'g1', title: 'A', ic_unread: '3', ooc_unread: '0' },
        { id: 'g2', title: 'B', ic_unread: '0', ooc_unread: '2' },
        { id: 'g3', title: 'C', ic_unread: '1', ooc_unread: '4' },
      ])
      .mockResolvedValueOnce([])

    const res = await unreadGet()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.count).toBe(3)        // total games with unread
    expect(data.ic_count).toBe(2)      // g1, g3
    expect(data.ooc_count).toBe(2)     // g2, g3
  })

  it('lists publish proposals separately from unread games', async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'gp', title: 'Pending', type: 'publish' }])

    const res = await unreadGet()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.proposals).toHaveLength(1)
    expect(data.proposals[0]).toMatchObject({ id: 'gp', type: 'publish' })
  })
})

// ── /admin/reports — single-query shape ───────────────────────────────────

describe('GET /api/admin/reports — single-query optimisation (audit-v4 medium)', () => {
  function makeReq(qs = '') {
    return new NextRequest(`http://localhost/api/admin/reports${qs}`)
  }

  it('returns total alongside reports without a second SELECT COUNT(*) roundtrip', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 'r1', game_id: 'g1', reporter_id: 'u1', reason: 'spam', status: 'pending',
        created_at: '2026-01-01', resolved_by: null, resolved_at: null,
        moderation_status: 'visible', request_title: 'X', pending_count: '1', _total: '7' },
      { id: 'r2', game_id: 'g2', reporter_id: 'u2', reason: 'creepy', status: 'pending',
        created_at: '2026-01-02', resolved_by: null, resolved_at: null,
        moderation_status: 'visible', request_title: 'Y', pending_count: '1', _total: '7' },
    ])

    const res = await adminReportsGet(makeReq())
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.total).toBe(7)
    expect(data.reports).toHaveLength(2)
    // Internal pagination column must not leak to the wire.
    expect(data.reports[0]).not.toHaveProperty('_total')
    // Exactly one DB call — no second SELECT COUNT(*) FROM reports.
    expect(mockQuery).toHaveBeenCalledTimes(1)
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/COUNT\(\*\)\s+OVER\(\)/i)
  })

  it('returns total=0 when there are no rows', async () => {
    mockQuery.mockResolvedValueOnce([])
    const res = await adminReportsGet(makeReq())
    const data = await res.json()
    expect(data.total).toBe(0)
    expect(data.reports).toEqual([])
  })
})
