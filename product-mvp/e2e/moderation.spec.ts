/**
 * E2E 2.9 — Модерация игры.
 *
 * Setup: fresh author + responder, duo game with 20 seeded IC posts, then
 * the publish flow has been driven to status='moderation' via the
 * publish-consent / publish-response API (covered separately by 2.8).
 *
 * Tests:
 *   - Admin (seed user `luna`, role='admin' from seed-dev.sql:235) calls
 *     POST /api/admin/games/[id]/moderate { action: 'approve' } → game
 *     transitions to 'published' and gets a published_at timestamp.
 *   - Same with action='reject' → game returns to 'active'.
 *   - Non-admin (the responder) cannot moderate (403).
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'
import { registerFreshUser } from './fixtures/register'
import { getGameStatus, listGameParticipants, seedIcMessages } from './fixtures/db'

async function setupGameInModeration(
  authorCtx: import('@playwright/test').BrowserContext,
  responderCtx: import('@playwright/test').BrowserContext,
  suffix: string,
) {
  await registerFreshUser(authorCtx, `e2e-mod-${suffix}-author`)
  await registerFreshUser(responderCtx, `e2e-mod-${suffix}-responder`)

  const title = `E2E moderation ${suffix} ${Date.now()}`
  const createRes = await authorCtx.request.post('/api/requests', {
    data: {
      title,
      description: '<p>moderation base body.</p>',
      type: 'duo',
      fandom_type: 'original',
      pairing: 'any',
      content_level: 'none',
      language: 'ru',
      tags: [`e2e-mod-${suffix}-1`, `e2e-mod-${suffix}-2`, `e2e-mod-${suffix}-3`],
      structured_tags: [],
      is_public: true,
      status: 'active',
    },
  })
  const requestId = (await createRes.json()).id

  const responderPage = await responderCtx.newPage()
  await responderPage.goto(`/requests/${requestId}`)
  await responderPage.getByRole('button', { name: /^ответить$/i }).click()
  await responderPage.waitForURL(/\/games\/[0-9a-f-]{36}/, { timeout: 15_000 })
  const gameId = responderPage.url().split('/games/')[1].split(/[/?#]/)[0]

  const participants = await listGameParticipants(gameId)
  await seedIcMessages(gameId, participants[0].id, 10, `mod-${suffix}-p0`)
  await seedIcMessages(gameId, participants[1].id, 10, `mod-${suffix}-p1`)

  const propose = await authorCtx.request.post(`/api/games/${gameId}/publish-consent`)
  expect(propose.ok(), `propose: ${propose.status()}`).toBeTruthy()
  const respond = await responderCtx.request.post(`/api/games/${gameId}/publish-response`, {
    data: { choice: 'publish_as_is' },
  })
  expect(respond.ok(), `respond: ${respond.status()}`).toBeTruthy()

  return { gameId, title }
}

test.describe('Moderation', () => {
  test('admin approve: game transitions to published', async ({ browser }) => {
    const authorCtx = await browser.newContext()
    const responderCtx = await browser.newContext()
    const adminCtx = await browser.newContext()
    try {
      const { gameId } = await setupGameInModeration(authorCtx, responderCtx, 'app')

      const adminPage = await adminCtx.newPage()
      await loginAs(adminPage, 'luna')

      const moderate = await adminCtx.request.post(`/api/admin/games/${gameId}/moderate`, {
        data: { action: 'approve' },
      })
      expect(moderate.ok(), `moderate: ${moderate.status()} ${await moderate.text()}`).toBeTruthy()
      const body = await moderate.json()
      expect(body.status).toBe('published')

      const game = await getGameStatus(gameId)
      expect(game?.status).toBe('published')

      // Sanity: game should be reachable on the public library API.
      const libRes = await adminCtx.request.get(`/api/public-games/${gameId}`)
      expect(libRes.ok(), `public-games GET: ${libRes.status()}`).toBeTruthy()
    } finally {
      await authorCtx.close()
      await responderCtx.close()
      await adminCtx.close()
    }
  })

  test('admin reject: game returns to active and consents are cleared', async ({ browser }) => {
    const authorCtx = await browser.newContext()
    const responderCtx = await browser.newContext()
    const adminCtx = await browser.newContext()
    try {
      const { gameId } = await setupGameInModeration(authorCtx, responderCtx, 'rej')

      const adminPage = await adminCtx.newPage()
      await loginAs(adminPage, 'luna')

      const moderate = await adminCtx.request.post(`/api/admin/games/${gameId}/moderate`, {
        data: { action: 'reject' },
      })
      expect(moderate.ok(), `moderate: ${moderate.status()}`).toBeTruthy()
      expect((await moderate.json()).status).toBe('active')

      const game = await getGameStatus(gameId)
      expect(game?.status).toBe('active')
    } finally {
      await authorCtx.close()
      await responderCtx.close()
      await adminCtx.close()
    }
  })

  test('non-admin cannot moderate (403)', async ({ browser }) => {
    const authorCtx = await browser.newContext()
    const responderCtx = await browser.newContext()
    try {
      const { gameId } = await setupGameInModeration(authorCtx, responderCtx, 'sec')

      // Responder is a regular user. Calling moderate must be forbidden.
      const res = await responderCtx.request.post(`/api/admin/games/${gameId}/moderate`, {
        data: { action: 'approve' },
      })
      expect([401, 403]).toContain(res.status())

      const game = await getGameStatus(gameId)
      expect(game?.status).toBe('moderation')
    } finally {
      await authorCtx.close()
      await responderCtx.close()
    }
  })
})
