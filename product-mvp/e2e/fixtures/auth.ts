import type { Page } from '@playwright/test'

/**
 * Logs in as a seed user via the regular /auth/login form.
 * Seed users (password: apocryph123): luna, wolf, ember, starfall.
 */
export async function loginAs(
  page: Page,
  user: 'luna' | 'wolf' | 'ember' | 'starfall' = 'luna',
) {
  await page.goto('/auth/login')
  await page.getByLabel(/email/i).fill(`${user}@apocryph.test`)
  await page.getByLabel(/пароль/i).fill('apocryph123')
  await page.getByRole('button', { name: /войти|login/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 10_000 })
}
