/**
 * E2E 2.1 — auth: register → logout → login.
 * Targets inputs by type attribute — the form's password row contains a
 * "Показать пароль" toggle button whose aria-label collides with getByLabel.
 */
import { test, expect } from '@playwright/test'

function freshEmail() {
  return `e2e-auth-${crypto.randomUUID().slice(0, 8)}@apocryph.test`
}

test.describe('Auth', () => {
  test('user can register, logout, and login again', async ({ page }) => {
    const email = freshEmail()
    const password = 'e2e-password-123'

    await page.goto('/auth/register')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.getByRole('checkbox', { name: /исполнилось 18/i }).check()
    await page.getByRole('button', { name: /создать аккаунт/i }).click()

    await page.waitForURL(/\/feed/, { timeout: 10_000 })

    const logout = page.getByRole('button', { name: 'Выйти' })
    await logout.first().click()
    await expect(logout.first()).toBeHidden()

    await page.goto('/auth/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.getByRole('button', { name: /^войти/i }).click()
    await page.waitForURL(/\/feed/, { timeout: 10_000 })

    await expect(page.getByRole('button', { name: 'Выйти' }).first()).toBeVisible()
  })

  test('login rejects wrong password', async ({ page }) => {
    await page.goto('/auth/login')
    await page.locator('input[type="email"]').fill('luna@apocryph.test')
    await page.locator('input[type="password"]').fill('definitely-not-the-password')
    await page.getByRole('button', { name: /^войти/i }).click()

    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(
      page.getByText(/неверн(ый|ые)\s+email|неправильн/i).first(),
    ).toBeVisible({ timeout: 5_000 })
  })

  test('register rejects short password', async ({ page }) => {
    await page.goto('/auth/register')
    await page.locator('input[type="email"]').fill(freshEmail())
    await page.locator('input[type="password"]').fill('short')
    await page.getByRole('checkbox', { name: /исполнилось 18/i }).check()
    await page.getByRole('button', { name: /создать аккаунт/i }).click()

    await expect(page).toHaveURL(/\/auth\/register/)
    await expect(page.getByText(/минимум\s+6|too\s+short/i).first()).toBeVisible()
  })
})
