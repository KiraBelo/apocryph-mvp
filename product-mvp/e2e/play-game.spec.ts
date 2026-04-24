/**
 * E2E 2.7 — Игра + SSE.
 *
 * Setup: two fresh users (author + responder) → duo request → respond → game.
 *
 * Test: author posts an IC message via API; responder, who is already on
 * /games/[id], must see that text appear via SSE without a page reload.
 *
 * We post via API instead of typing in TipTap — the SSE round trip is
 * the regression we care about, and it's identical to the UI-typed path.
 */
import { test, expect } from '@playwright/test'
import { registerFreshUser } from './fixtures/register'

test.describe('Play game — SSE', () => {
  test('responder sees author message live via SSE without reload', async ({ browser }) => {
    const authorCtx = await browser.newContext()
    const responderCtx = await browser.newContext()
    try {
      await registerFreshUser(authorCtx, 'e2e-sse-author')
      await registerFreshUser(responderCtx, 'e2e-sse-responder')

      // Create request as author
      const title = `E2E SSE ${Date.now()}`
      const createRes = await authorCtx.request.post('/api/requests', {
        data: {
          title,
          description: '<p>SSE base body.</p>',
          type: 'duo',
          fandom_type: 'original',
          pairing: 'any',
          content_level: 'none',
          language: 'ru',
          tags: ['e2e-sse-1', 'e2e-sse-2', 'e2e-sse-3'],
          structured_tags: [],
          is_public: true,
          status: 'active',
        },
      })
      const created = await createRes.json()
      const requestId = created.id

      // Responder accepts → /games/[id]
      const responderPage = await responderCtx.newPage()
      await responderPage.goto(`/requests/${requestId}`)
      await responderPage.getByRole('button', { name: /^ответить$/i }).click()
      await responderPage.waitForURL(/\/games\/[0-9a-f-]{36}/, { timeout: 15_000 })
      const gameId = responderPage.url().split('/games/')[1].split(/[/?#]/)[0]

      // Responder stays on /games/[id] — SSE EventSource opens automatically.
      // First post (the request body) is already visible — sanity check.
      await expect(responderPage.getByText('SSE base body.')).toBeVisible({ timeout: 10_000 })

      // Author posts a unique IC message via API (no UI typing needed for SSE round-trip).
      const liveText = `live-sse-marker-${crypto.randomUUID().slice(0, 8)}`
      const postRes = await authorCtx.request.post(`/api/games/${gameId}/messages`, {
        data: { content: `<p>${liveText}</p>`, type: 'ic' },
      })
      expect(postRes.ok(), `messages POST: ${postRes.status()} ${await postRes.text()}`).toBeTruthy()

      // The responder's open page must surface the new text via SSE — no reload.
      await expect(responderPage.getByText(liveText)).toBeVisible({ timeout: 15_000 })
    } finally {
      await authorCtx.close()
      await responderCtx.close()
    }
  })

  test('non-participant cannot read messages of a game', async ({ browser }) => {
    const authorCtx = await browser.newContext()
    const responderCtx = await browser.newContext()
    const outsiderCtx = await browser.newContext()
    try {
      await registerFreshUser(authorCtx, 'e2e-priv-author')
      await registerFreshUser(responderCtx, 'e2e-priv-responder')
      await registerFreshUser(outsiderCtx, 'e2e-priv-outsider')

      const title = `E2E priv ${Date.now()}`
      const createRes = await authorCtx.request.post('/api/requests', {
        data: {
          title,
          description: '<p>private body.</p>',
          type: 'duo',
          fandom_type: 'original',
          pairing: 'any',
          content_level: 'none',
          language: 'ru',
          tags: ['e2e-priv-1', 'e2e-priv-2', 'e2e-priv-3'],
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

      // Outsider tries to read messages via API — must be 403.
      const outsiderRes = await outsiderCtx.request.get(`/api/games/${gameId}/messages?page=1`)
      expect(outsiderRes.status()).toBe(403)
    } finally {
      await authorCtx.close()
      await responderCtx.close()
      await outsiderCtx.close()
    }
  })
})
