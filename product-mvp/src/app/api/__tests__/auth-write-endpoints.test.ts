import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  withTransaction: vi.fn(),
}))

vi.mock('@/lib/session', async () => {
  const { handleAuthErrorMock } = await import('@/test/mocks/session-helpers')
  return {
    requireUser: vi.fn(),
    getUser: vi.fn(),
    handleAuthError: handleAuthErrorMock,
  }
})

vi.mock('@/lib/sanitize', () => ({
  sanitizeBody: (s: string) => s,
}))

import { requireUser } from '@/lib/session'
import { POST as likesPost } from '@/app/api/public-games/[id]/likes/route'
import { POST as commentsPost } from '@/app/api/public-games/[id]/comments/route'
import { PATCH as notesPatch, DELETE as notesDelete } from '@/app/api/games/[id]/notes/[noteId]/route'

const mockRequireUser = vi.mocked(requireUser)

beforeEach(() => {
  const g = globalThis as unknown as { __rateLimitStore?: Map<string, unknown> }
  g.__rateLimitStore?.clear()
  vi.clearAllMocks()
})

// CRIT-2 (audit-v4): write endpoints MUST use requireUser, which checks ban
// and session_version against the DB on every call. getUser only reads the
// cookie and lets banned users keep performing write actions.
describe('write endpoints reject banned users (CRIT-2 regression)', () => {
  function bannedAuth() {
    mockRequireUser.mockResolvedValueOnce({ error: 'banned', user: null, banReason: 'spam' })
  }

  it('POST /api/public-games/[id]/likes returns 403 for banned user', async () => {
    bannedAuth()
    const req = new NextRequest('http://localhost/api/public-games/g1/likes', { method: 'POST' })
    const res = await likesPost(req, { params: Promise.resolve({ id: 'g1' }) })
    expect(res.status).toBe(403)
  })

  it('POST /api/public-games/[id]/comments returns 403 for banned user', async () => {
    bannedAuth()
    const req = new NextRequest('http://localhost/api/public-games/g1/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'hi' }),
    })
    const res = await commentsPost(req, { params: Promise.resolve({ id: 'g1' }) })
    expect(res.status).toBe(403)
  })

  it('PATCH /api/games/[id]/notes/[noteId] returns 403 for banned user', async () => {
    bannedAuth()
    const req = new NextRequest('http://localhost/api/games/g1/notes/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' }),
    })
    const res = await notesPatch(req, { params: Promise.resolve({ id: 'g1', noteId: '1' }) })
    expect(res.status).toBe(403)
  })

  it('DELETE /api/games/[id]/notes/[noteId] returns 403 for banned user', async () => {
    bannedAuth()
    const req = new NextRequest('http://localhost/api/games/g1/notes/1', { method: 'DELETE' })
    const res = await notesDelete(req, { params: Promise.resolve({ id: 'g1', noteId: '1' }) })
    expect(res.status).toBe(403)
  })
})
