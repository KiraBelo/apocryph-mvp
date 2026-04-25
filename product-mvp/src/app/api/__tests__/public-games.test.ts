import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  getUser: vi.fn().mockResolvedValue(null),
}))

import { query, queryOne } from '@/lib/db'
import { GET as getList } from '@/app/api/public-games/route'
import { GET as getOne } from '@/app/api/public-games/[id]/route'

const mockQuery = vi.mocked(query)
const mockQueryOne = vi.mocked(queryOne)

beforeEach(() => {
  vi.clearAllMocks()
})

// CRIT-7 (audit-v4): nicknames are user input and MUST be sanitized before
// being exposed through the public API. Otherwise a stored XSS payload in a
// nickname becomes a public XSS vector for any unauthenticated visitor of
// /library.
describe('GET /api/public-games — anti-XSS (CRIT-7 regression)', () => {
  it('strips HTML from nicknames in the participants list', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        id: 'g1', published_at: '2026-04-01T00:00:00Z', banner_url: null,
        request_title: 'Title', request_type: null, request_fandom_type: null,
        request_pairing: null, request_content_level: null, request_language: null,
        request_tags: null, ic_count: '5', likes_count: '0',
        participants: JSON.stringify([
          { nickname: '<script>alert(1)</script>Luna', avatar_url: null },
          { nickname: 'Wolf<img src=x onerror=alert(1)>', avatar_url: null },
        ]),
        _total: '1',
      },
    ])

    const req = new NextRequest('http://localhost/api/public-games')
    const res = await getList(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.games).toHaveLength(1)
    expect(data.games[0].participants[0].nickname).toBe('Luna')
    expect(data.games[0].participants[1].nickname).toBe('Wolf')
    // No raw HTML must reach the client
    const serialized = JSON.stringify(data)
    expect(serialized).not.toContain('<script>')
    expect(serialized).not.toContain('onerror')
  })
})

describe('GET /api/public-games/[id] — anti-XSS (CRIT-7 regression)', () => {
  function makeReq(): NextRequest {
    return new NextRequest('http://localhost/api/public-games/g1')
  }

  it('strips HTML from nicknames in participants and messages', async () => {
    // game lookup
    mockQueryOne.mockResolvedValueOnce({
      id: 'g1', status: 'published', published_at: '2026-04-01T00:00:00Z',
      banner_url: null, moderation_status: 'visible', request_id: 'r1',
    })
    // request metadata
    mockQueryOne.mockResolvedValueOnce({
      title: 'T', type: null, fandom_type: null, pairing: null,
      content_level: null, tags: null, body: null,
    })
    // participants
    mockQuery.mockResolvedValueOnce([
      { id: 'p1', nickname: '<script>alert(1)</script>Luna', avatar_url: null },
    ])
    // count
    mockQueryOne.mockResolvedValueOnce({ count: '1' })
    // messages
    mockQuery.mockResolvedValueOnce([
      { id: 'm1', participant_id: 'p1', content: 'hi', created_at: '2026-04-01T00:00:00Z',
        nickname: '<img src=x onerror=alert(1)>Luna', avatar_url: null },
    ])

    const res = await getOne(makeReq(), { params: Promise.resolve({ id: 'g1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.participants[0].nickname).toBe('Luna')
    expect(data.messages[0].nickname).toBe('Luna')
    const serialized = JSON.stringify(data)
    expect(serialized).not.toContain('<script>')
    expect(serialized).not.toContain('onerror')
  })
})
