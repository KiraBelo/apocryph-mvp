/**
 * GOLD STANDARD: E2E-тест
 *
 * Принципы:
 * - Никогда не используем page.waitForTimeout(). Только auto-waiting API (expect.toBeVisible).
 * - Используем семантические локаторы (getByRole, getByLabel), не CSS-классы.
 * - Логин через fixture loginAs(), не копипаста через заполнение формы.
 * - Каждый describe независим: не рассчитываем на состояние от предыдущего describe.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from '../../e2e/fixtures/auth'

test.describe('Feed page (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'luna')
  })

  test('user sees feed of requests after login', async ({ page }) => {
    await page.goto('/feed')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('create-request button is reachable from feed', async ({ page }) => {
    await page.goto('/feed')
    const createLink = page.getByRole('link', { name: /создать|новая заявка/i }).first()
    await expect(createLink).toBeVisible()
  })
})
