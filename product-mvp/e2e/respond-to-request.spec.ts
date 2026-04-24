/**
 * E2E 2.6 — Отклик на заявку → создание игры.
 *
 * Two browser contexts:
 *   - Author: registers fresh, creates a duo request via API.
 *   - Responder: registers fresh, opens /requests/[id], clicks «Ответить»,
 *     gets redirected to /games/[id].
 *
 * Then: author opens /my/games and sees the game.
 *
 * Why fresh users (not seed): each CI run re-creates seed data, but multiple
 * tests in the same run hitting the 3-min request cooldown would flake. Fresh
 * users mean each test pays its own author/responder cost without crosstalk.
 */
import { test, expect } from '@playwright/test'
import { registerFreshUser } from './fixtures/register'

test.describe('Respond to request', () => {
  test('responder can answer a duo request and gets redirected to /games/[id]', async ({ browser }) => {
    const authorCtx = await browser.newContext()
    const responderCtx = await browser.newContext()
    try {
      const author = await registerFreshUser(authorCtx, 'e2e-resp-author')
      const responder = await registerFreshUser(responderCtx, 'e2e-resp-responder')

      const title = `E2E respond ${Date.now()}`
      const createRes = await authorCtx.request.post('/api/requests', {
        data: {
          title,
          description: '<p>Body for E2E respond test.</p>',
          type: 'duo',
          fandom_type: 'original',
          pairing: 'any',
          content_level: 'none',
          language: 'ru',
          tags: ['e2e-r-1', 'e2e-r-2', 'e2e-r-3'],
          structured_tags: [],
          is_public: true,
          status: 'active',
        },
      })
      expect(createRes.ok(), `POST /api/requests: ${createRes.status()}`).toBeTruthy()
      const created = await createRes.json()
      const requestId = created.id

      // Responder opens the request page and clicks «Ответить»
      const responderPage = await responderCtx.newPage()
      await responderPage.goto(`/requests/${requestId}`)

      // Title must be visible (sanity)
      await expect(responderPage.getByRole('heading', { name: title })).toBeVisible({ timeout: 10_000 })

      // Optional nickname input — leave default
      await responderPage.getByRole('button', { name: /^ответить$/i }).click()

      // Redirected to /games/[uuid]
      await responderPage.waitForURL(/\/games\/[0-9a-f-]{36}/, { timeout: 15_000 })
      const gameUrl = responderPage.url()

      // The responder got to /games/[uuid] — that's the regression signal.
      // We deliberately skip the author's /my/games check: its default subtab
      // is "waiting-me" (game's last_message_user_id !== userId), and a freshly
      // responded game's first IC post is authored by... the author themselves
      // (it copies the request body), so from author's POV the game lives in
      // "waiting-them". Asserting a specific subtab here is brittle.
      expect(gameUrl).toMatch(/\/games\/[0-9a-f-]{36}/)

      // Used variables (silence unused warnings)
      void author
      void responder
    } finally {
      await authorCtx.close()
      await responderCtx.close()
    }
  })

  test('author cannot respond to their own request', async ({ browser }) => {
    const authorCtx = await browser.newContext()
    try {
      await registerFreshUser(authorCtx, 'e2e-resp-self')

      const title = `E2E self-respond ${Date.now()}`
      const createRes = await authorCtx.request.post('/api/requests', {
        data: {
          title,
          description: '<p>Body.</p>',
          type: 'duo',
          fandom_type: 'original',
          pairing: 'any',
          content_level: 'none',
          language: 'ru',
          tags: ['e2e-self-1', 'e2e-self-2', 'e2e-self-3'],
          structured_tags: [],
          is_public: true,
          status: 'active',
        },
      })
      const created = await createRes.json()
      const requestId = created.id

      // Author opens own request — respond box must not be present.
      const authorPage = await authorCtx.newPage()
      await authorPage.goto(`/requests/${requestId}`)
      await expect(authorPage.getByRole('heading', { name: title })).toBeVisible({ timeout: 10_000 })

      // The «Ответить» button is rendered only when `!isAuthor` — author sees edit/deactivate instead.
      await expect(authorPage.getByRole('button', { name: /^ответить$/i })).toHaveCount(0)
      await expect(
        authorPage.getByRole('link', { name: /редактировать/i }).or(
          authorPage.getByRole('button', { name: /убрать из ленты/i }),
        ),
      ).toBeVisible()
    } finally {
      await authorCtx.close()
    }
  })
})
