/**
 * E2E 2.8 — Жизненный цикл публикации.
 *
 * Author and responder spin up a fresh duo game (covered by 2.6/2.7).
 * Then we seed 20 IC messages directly via SQL to clear MIN_IC_POSTS
 * (going through POST /messages would hit the 30/min rate limit and
 * stretch the test for nothing — the regression we care about lives
 * in publish-consent / publish-response, not the messages route).
 *
 * Flow:
 *   - publish-consent must FAIL with tooFewMessages before we seed.
 *   - After seeding 20 IC posts: author POST publish-consent → 200.
 *   - Responder POST publish-response { choice: 'publish_as_is' } → 200,
 *     and games.status flips to 'moderation'.
 */
import { test, expect } from '@playwright/test'
import { registerFreshUser } from './fixtures/register'
import { getGameStatus, listGameParticipants, seedIcMessages } from './fixtures/db'

async function setupGame(authorCtx: import('@playwright/test').BrowserContext, responderCtx: import('@playwright/test').BrowserContext, suffix: string) {
  await registerFreshUser(authorCtx, `e2e-pub-${suffix}-author`)
  await registerFreshUser(responderCtx, `e2e-pub-${suffix}-responder`)

  const title = `E2E publish ${suffix} ${Date.now()}`
  const createRes = await authorCtx.request.post('/api/requests', {
    data: {
      title,
      description: '<p>publish base body.</p>',
      type: 'duo',
      fandom_type: 'original',
      pairing: 'any',
      content_level: 'none',
      language: 'ru',
      tags: [`e2e-pub-${suffix}-1`, `e2e-pub-${suffix}-2`, `e2e-pub-${suffix}-3`],
      structured_tags: [],
      is_public: true,
      status: 'active',
    },
  })
  expect(createRes.ok(), `POST /api/requests: ${createRes.status()}`).toBeTruthy()
  const requestId = (await createRes.json()).id

  const responderPage = await responderCtx.newPage()
  await responderPage.goto(`/requests/${requestId}`)
  await responderPage.getByRole('button', { name: /^ответить$/i }).click()
  await responderPage.waitForURL(/\/games\/[0-9a-f-]{36}/, { timeout: 15_000 })
  const gameId = responderPage.url().split('/games/')[1].split(/[/?#]/)[0]
  return { gameId, responderPage, title }
}

test.describe('Publish to library', () => {
  test('publish-consent rejects games with too few IC messages', async ({ browser }) => {
    const authorCtx = await browser.newContext()
    const responderCtx = await browser.newContext()
    try {
      const { gameId } = await setupGame(authorCtx, responderCtx, 'few')

      // First post (the request body) is the only IC message — under threshold.
      const res = await authorCtx.request.post(`/api/games/${gameId}/publish-consent`)
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('tooFewMessages')
    } finally {
      await authorCtx.close()
      await responderCtx.close()
    }
  })

  test('full publish-consent → publish-response → status=moderation', async ({ browser }) => {
    const authorCtx = await browser.newContext()
    const responderCtx = await browser.newContext()
    try {
      const { gameId } = await setupGame(authorCtx, responderCtx, 'ok')

      // Seed 20 IC posts evenly between participants.
      const participants = await listGameParticipants(gameId)
      expect(participants).toHaveLength(2)
      await seedIcMessages(gameId, participants[0].id, 10, 'p0')
      await seedIcMessages(gameId, participants[1].id, 10, 'p1')

      // Author proposes publish.
      const proposeRes = await authorCtx.request.post(`/api/games/${gameId}/publish-consent`)
      expect(proposeRes.ok(), `propose: ${proposeRes.status()} ${await proposeRes.text()}`).toBeTruthy()

      // Author cannot self-approve.
      const selfRes = await authorCtx.request.post(`/api/games/${gameId}/publish-response`, {
        data: { choice: 'publish_as_is' },
      })
      expect(selfRes.status()).toBe(403)

      // Responder approves "as is" → status flips to moderation.
      const respondRes = await responderCtx.request.post(`/api/games/${gameId}/publish-response`, {
        data: { choice: 'publish_as_is' },
      })
      expect(respondRes.ok(), `respond: ${respondRes.status()} ${await respondRes.text()}`).toBeTruthy()
      const respBody = await respondRes.json()
      expect(respBody.status).toBe('moderation')

      const game = await getGameStatus(gameId)
      expect(game?.status).toBe('moderation')
    } finally {
      await authorCtx.close()
      await responderCtx.close()
    }
  })

  test('responder choosing edit_first sends game to preparing', async ({ browser }) => {
    const authorCtx = await browser.newContext()
    const responderCtx = await browser.newContext()
    try {
      const { gameId } = await setupGame(authorCtx, responderCtx, 'edit')
      const participants = await listGameParticipants(gameId)
      await seedIcMessages(gameId, participants[0].id, 20, 'edit-p0')

      const proposeRes = await authorCtx.request.post(`/api/games/${gameId}/publish-consent`)
      expect(proposeRes.ok()).toBeTruthy()

      const respondRes = await responderCtx.request.post(`/api/games/${gameId}/publish-response`, {
        data: { choice: 'edit_first' },
      })
      expect(respondRes.ok()).toBeTruthy()
      const game = await getGameStatus(gameId)
      expect(game?.status).toBe('preparing')
    } finally {
      await authorCtx.close()
      await responderCtx.close()
    }
  })
})
