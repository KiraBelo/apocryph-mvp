import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (must be declared before imports) ────────────────────────────────

vi.mock('../db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}))

import { queryOne } from '../db'
import { requireParticipant } from '../auth'

const mockQueryOne = vi.mocked(queryOne)

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Helpers ───────────────────────────────────────────────────────────────

const GAME_ID = 'game-uuid-1'
const USER_ID = 'user-uuid-1'

const activeParticipant = {
  id: 'p-uuid-1',
  game_id: GAME_ID,
  user_id: USER_ID,
  nickname: 'TestPlayer',
  avatar_url: null,
  banner_url: null,
  banner_pref: 'own' as const,
  left_at: null,
  leave_reason: null,
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('requireParticipant', () => {
  it('returns participant data for active participant', async () => {
    mockQueryOne.mockResolvedValueOnce(activeParticipant)

    const result = await requireParticipant(GAME_ID, USER_ID)

    expect(result).toEqual(activeParticipant)
    expect(mockQueryOne).toHaveBeenCalledWith(
      'SELECT * FROM game_participants WHERE game_id = $1 AND user_id = $2 AND left_at IS NULL',
      [GAME_ID, USER_ID]
    )
  })

  it('returns null for non-participant', async () => {
    mockQueryOne.mockResolvedValueOnce(null)

    const result = await requireParticipant(GAME_ID, 'unknown-user')

    expect(result).toBeNull()
  })

  it('returns null for left participant by default', async () => {
    // Default query has "AND left_at IS NULL", so DB returns null for left participant
    mockQueryOne.mockResolvedValueOnce(null)

    const result = await requireParticipant(GAME_ID, USER_ID)

    expect(result).toBeNull()
    // Verify the query includes the left_at IS NULL clause
    expect(mockQueryOne).toHaveBeenCalledWith(
      expect.stringContaining('AND left_at IS NULL'),
      [GAME_ID, USER_ID]
    )
  })

  it('returns left participant when includeLeft: true', async () => {
    const leftParticipant = {
      ...activeParticipant,
      left_at: '2026-03-01T00:00:00Z',
      leave_reason: 'Personal reasons',
    }
    mockQueryOne.mockResolvedValueOnce(leftParticipant)

    const result = await requireParticipant(GAME_ID, USER_ID, { includeLeft: true })

    expect(result).toEqual(leftParticipant)
    // Verify the query does NOT include left_at IS NULL
    const calledSql = mockQueryOne.mock.calls[0][0] as string
    expect(calledSql).not.toContain('AND left_at IS NULL')
  })

  it('returns null for invalid gameId (no matching rows)', async () => {
    mockQueryOne.mockResolvedValueOnce(null)

    const result = await requireParticipant('nonexistent-game', USER_ID)

    expect(result).toBeNull()
  })

  it('passes correct parameters to queryOne', async () => {
    mockQueryOne.mockResolvedValueOnce(null)

    await requireParticipant('game-abc', 'user-xyz')

    expect(mockQueryOne).toHaveBeenCalledWith(
      expect.any(String),
      ['game-abc', 'user-xyz']
    )
  })
})
