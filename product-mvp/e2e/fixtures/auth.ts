import type { Page } from '@playwright/test'
import { SEED_USERS, type SeedUserKey } from './users'

/**
 * Logs in as a seed user via the /auth/login form.
 *
 * We target inputs by `input[type="email|password"]` rather than getByLabel —
 * the form wraps its inputs in a label with a "Показать пароль" toggle button
 * whose aria-label contains the word "Пароль", so getByLabel('Пароль') would
 * resolve to the button instead of the input.
 */
export async function loginAs(page: Page, user: SeedUserKey = 'luna') {
  const creds = SEED_USERS[user]
  await page.goto('/auth/login')
  await page.locator('input[type="email"]').fill(creds.email)
  await page.locator('input[type="password"]').fill(creds.password)
  await page.getByRole('button', { name: /войти|log\s*in/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 10_000 })
}
