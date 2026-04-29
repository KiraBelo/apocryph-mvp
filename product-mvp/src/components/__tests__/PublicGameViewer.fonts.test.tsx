import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import PublicGameViewer from '@/components/PublicGameViewer'

vi.mock('@/lib/font-loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/font-loader')>()
  return {
    ...actual,
    loadFont: vi.fn(),
    loadFonts: vi.fn(),
    loadAllCatalogFonts: vi.fn(),
  }
})

import { loadFonts } from '@/lib/font-loader'

vi.mock('@/components/SettingsContext', () => ({
  useT: () => (key: string) => key,
}))

vi.mock('@/components/game/PublicComments', () => ({
  default: () => null,
}))

function buildGameJson(messageHtml: string[]) {
  return {
    game: { id: 'g1', banner_url: null, published_at: '2026-01-01T00:00:00Z' },
    request: null,
    participants: [
      { id: 'p1', nickname: 'Alpha', avatar_url: null },
      { id: 'p2', nickname: 'Beta', avatar_url: null },
    ],
    messages: messageHtml.map((html, i) => ({
      id: `m${i}`,
      participant_id: i % 2 === 0 ? 'p1' : 'p2',
      content: html,
      created_at: '2026-01-01T00:00:00Z',
      nickname: i % 2 === 0 ? 'Alpha' : 'Beta',
      avatar_url: null,
    })),
    page: 1,
    totalPages: 1,
    total: messageHtml.length,
  }
}

function setupGameApi(messageHtml: string[]) {
  server.use(
    http.get('/api/public-games/:id', () => HttpResponse.json(buildGameJson(messageHtml))),
    http.get('/api/public-games/:id/likes', () =>
      HttpResponse.json({ count: 0, liked: false }),
    ),
  )
}

describe('PublicGameViewer — fonts in messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lazy-loads google fonts mentioned in message HTML', async () => {
    setupGameApi([
      '<p style="font-family: Lora, Georgia, serif">Lora line</p>',
      '<p style="font-family: Caveat, cursive">Caveat line</p>',
    ])

    render(<PublicGameViewer gameId="g1" userId={null} />)

    await waitFor(() => {
      expect(screen.getByText('Lora line')).toBeInTheDocument()
    })

    expect(loadFonts).toHaveBeenCalledTimes(1)
    const arg = (loadFonts as unknown as { mock: { calls: string[][][] } }).mock.calls[0][0]
    expect([...arg].sort()).toEqual(['Caveat', 'Lora'])
  })

  it('does not call loadFonts when no google fonts are used', async () => {
    setupGameApi([
      '<p>Plain text</p>',
      '<p style="font-family: Georgia, serif">System font only</p>',
    ])

    render(<PublicGameViewer gameId="g1" userId={null} />)

    await waitFor(() => {
      expect(screen.getByText('Plain text')).toBeInTheDocument()
    })

    expect(loadFonts).not.toHaveBeenCalled()
  })
})
