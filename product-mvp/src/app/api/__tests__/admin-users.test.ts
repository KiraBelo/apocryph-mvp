import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks (must be declared before imports) ───────────────────────────────

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  requireMod: vi.fn().mockResolvedValue({ error: 'forbidden', user: null }),
}))

import { query } from '@/lib/db'
import { requireMod } from '@/lib/session'
import { GET } from '@/app/api/admin/users/route'

const mockQuery = vi.mocked(query)
const mockRequireMod = vi.mocked(requireMod)

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Helpers ───────────────────────────────────────────────────────────────

function makeRequest(qs = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/users${qs}`)
}

// ── GET /api/admin/users ──────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  describe('authentication and authorization', () => {
    it('returns 401 when not authenticated', async () => {
      mockRequireMod.mockResolvedValueOnce({ error: 'unauthorized', user: null })

      const res = await GET(makeRequest())

      expect(res.status).toBe(401)
    })

    it('returns 403 when user has regular user role', async () => {
      mockRequireMod.mockResolvedValueOnce({ error: 'forbidden', user: null })

      const res = await GET(makeRequest())

      expect(res.status).toBe(403)
    })
  })

  describe('successful access', () => {
    it('returns 200 when moderator accesses the endpoint', async () => {
      mockRequireMod.mockResolvedValueOnce({
        error: null,
        user: { id: 'mod-id', email: 'mod@test.com', role: 'moderator' },
      })
      mockQuery.mockResolvedValueOnce([
        {
          id: 'u1',
          email: 'user1@test.com',
          role: 'user',
          banned_at: null,
          ban_reason: null,
          created_at: '2026-01-01',
        },
      ])
      mockQuery.mockResolvedValueOnce([{ cnt: '1' }])

      const res = await GET(makeRequest())
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.users).toHaveLength(1)
      expect(data.total).toBe(1)
      expect(data.page).toBe(1)
    })

    it('returns 200 when admin accesses the endpoint', async () => {
      mockRequireMod.mockResolvedValueOnce({
        error: null,
        user: { id: 'admin-id', email: 'admin@test.com', role: 'admin' },
      })
      mockQuery.mockResolvedValueOnce([])
      mockQuery.mockResolvedValueOnce([{ cnt: '0' }])

      const res = await GET(makeRequest())

      expect(res.status).toBe(200)
    })
  })

  describe('search and pagination', () => {
    it('returns 200 with matching user when search query is provided', async () => {
      mockRequireMod.mockResolvedValueOnce({
        error: null,
        user: { id: 'mod-id', email: 'mod@test.com', role: 'moderator' },
      })
      mockQuery.mockResolvedValueOnce([
        {
          id: 'u2',
          email: 'found@test.com',
          role: 'user',
          banned_at: null,
          ban_reason: null,
          created_at: '2026-01-01',
        },
      ])
      mockQuery.mockResolvedValueOnce([{ cnt: '1' }])

      const res = await GET(makeRequest('?q=found'))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.users[0].email).toBe('found@test.com')
    })

    it('returns 200 with empty result when no users match search', async () => {
      mockRequireMod.mockResolvedValueOnce({
        error: null,
        user: { id: 'mod-id', email: 'mod@test.com', role: 'moderator' },
      })
      mockQuery.mockResolvedValueOnce([])
      mockQuery.mockResolvedValueOnce([{ cnt: '0' }])

      const res = await GET(makeRequest('?q=nonexistent'))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.users).toHaveLength(0)
      expect(data.total).toBe(0)
    })

    it('returns page number in response', async () => {
      mockRequireMod.mockResolvedValueOnce({
        error: null,
        user: { id: 'mod-id', email: 'mod@test.com', role: 'moderator' },
      })
      mockQuery.mockResolvedValueOnce([])
      mockQuery.mockResolvedValueOnce([{ cnt: '0' }])

      const res = await GET(makeRequest('?page=2'))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.page).toBe(2)
    })
  })
})
