import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (must be declared before imports) ────────────────────────────────
// vi.mock factories are hoisted — cannot reference local variables.
// Use vi.hoisted() to create shared state accessible from the factory.

const { mockSession } = vi.hoisted(() => {
  const mockSession = {
    userId: undefined as string | undefined,
    email: undefined as string | undefined,
    role: undefined as string | undefined,
    sessionVersion: undefined as number | undefined,
    destroy: vi.fn(),
    save: vi.fn(),
  }
  return { mockSession }
})

vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockResolvedValue(mockSession),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}))

vi.mock('../db', () => ({
  queryOne: vi.fn(),
}))

import { queryOne } from '../db'
import { requireUser } from '../session'

const mockQueryOne = vi.mocked(queryOne)

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockSession.userId = undefined
  mockSession.email = undefined
  mockSession.role = undefined
  mockSession.sessionVersion = undefined
  mockSession.destroy.mockReset()
  mockSession.save.mockResolvedValue(undefined)
})

// ── Tests ─────────────────────────────────────────────────────────────────

describe('requireUser — session version logic', () => {
  it('returns unauthorized when no userId in session', async () => {
    const result = await requireUser()

    expect(result).toEqual({ error: 'unauthorized', user: null, banReason: null })
    expect(mockQueryOne).not.toHaveBeenCalled()
  })

  it('returns unauthorized when user not found in DB', async () => {
    mockSession.userId = 'user-1'
    mockSession.email = 'a@b.com'
    mockQueryOne.mockResolvedValueOnce(null)

    const result = await requireUser()

    expect(result).toEqual({ error: 'unauthorized', user: null, banReason: null })
  })

  it('returns banned when user is banned', async () => {
    mockSession.userId = 'user-1'
    mockSession.email = 'a@b.com'
    mockQueryOne.mockResolvedValueOnce({
      banned_at: '2026-01-01', ban_reason: 'spam', session_version: 1, role: 'user',
    })

    const result = await requireUser()

    expect(result).toEqual({ error: 'banned', user: null, banReason: 'spam' })
  })

  it('auto-upgrades pre-existing session without sessionVersion (not logout)', async () => {
    mockSession.userId = 'user-1'
    mockSession.email = 'a@b.com'
    mockSession.sessionVersion = undefined

    mockQueryOne.mockResolvedValueOnce({
      banned_at: null, ban_reason: null, session_version: 5, role: 'user',
    })

    const result = await requireUser()

    // Should NOT log out — should return user
    expect(result.error).toBeNull()
    expect(result.user).toEqual({ id: 'user-1', email: 'a@b.com', role: 'user' })
    // Should auto-upgrade: set sessionVersion and save
    expect(mockSession.sessionVersion).toBe(5)
    expect(mockSession.save).toHaveBeenCalled()
    // Should NOT call destroy
    expect(mockSession.destroy).not.toHaveBeenCalled()
  })

  it('returns user normally when session version matches DB version', async () => {
    mockSession.userId = 'user-1'
    mockSession.email = 'a@b.com'
    mockSession.sessionVersion = 3

    mockQueryOne.mockResolvedValueOnce({
      banned_at: null, ban_reason: null, session_version: 3, role: 'moderator',
    })

    const result = await requireUser()

    expect(result.error).toBeNull()
    expect(result.user).toEqual({ id: 'user-1', email: 'a@b.com', role: 'moderator' })
    expect(mockSession.destroy).not.toHaveBeenCalled()
  })

  it('destroys session and returns unauthorized when version mismatches (password changed)', async () => {
    mockSession.userId = 'user-1'
    mockSession.email = 'a@b.com'
    mockSession.sessionVersion = 2

    mockQueryOne.mockResolvedValueOnce({
      banned_at: null, ban_reason: null, session_version: 3, role: 'user',
    })

    const result = await requireUser()

    expect(result).toEqual({ error: 'unauthorized', user: null, banReason: null })
    expect(mockSession.destroy).toHaveBeenCalled()
    expect(mockSession.save).toHaveBeenCalled()
  })

  it('uses role from DB row, not from session', async () => {
    mockSession.userId = 'user-1'
    mockSession.email = 'a@b.com'
    mockSession.role = 'user'
    mockSession.sessionVersion = 1

    mockQueryOne.mockResolvedValueOnce({
      banned_at: null, ban_reason: null, session_version: 1, role: 'admin',
    })

    const result = await requireUser()

    expect(result.user?.role).toBe('admin')
  })
})
