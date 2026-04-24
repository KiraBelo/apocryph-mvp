import type { Page } from '@playwright/test'
import { SEED_USERS, type SeedUserKey } from './users'

/**
 * Logs in as a seed user via the /auth/login form.
 * Waits until redirected away from /auth/* (post-login target varies by page).
 */
export async function loginAs(page: Page, user: SeedUserKey = 'luna') {
  const creds = SEED_USERS[user]
  await page.goto('/auth/login')
  await page.getByLabel(/email/i).fill(creds.email)
  await page.getByLabel(/пароль/i).fill(creds.password)
  await page.getByRole('button', { name: /войти|login/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 10_000 })
}
