/**
 * E2E 2.1 — auth: register → logout → login.
 * Простейший сквозной флоу, отлаживает всю E2E-инфраструктуру.
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
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Пароль').fill(password)
    // Чекбокс возраста — без него кнопка disabled.
    await page.getByRole('checkbox', { name: /исполнилось 18/i }).check()
    await page.getByRole('button', { name: /создать аккаунт/i }).click()

    // После регистрации редирект на /feed.
    await page.waitForURL(/\/feed/, { timeout: 10_000 })

    // Кнопка выхода в Nav — только aria-label="Выйти".
    const logout = page.getByRole('button', { name: 'Выйти' })
    await logout.click()

    // После logout — редирект на главную (лендинг для анонимов).
    await expect(logout).toBeHidden()

    // Логин тем же юзером.
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Пароль').fill(password)
    await page.getByRole('button', { name: /^войти/i }).click()
    await page.waitForURL(/\/feed/, { timeout: 10_000 })

    // Юзер залогинен: снова виден «Выйти».
    await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
  })

  test('login rejects wrong password', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('luna@apocryph.test')
    await page.getByLabel('Пароль').fill('definitely-not-the-password')
    await page.getByRole('button', { name: /^войти/i }).click()

    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(
      page.getByText(/неверн(ый|ые)\s+email|неправильн/i).first(),
    ).toBeVisible({ timeout: 5_000 })
  })

  test('register rejects short password', async ({ page }) => {
    await page.goto('/auth/register')
    await page.getByLabel('Email').fill(freshEmail())
    await page.getByLabel('Пароль').fill('short')
    await page.getByRole('checkbox', { name: /исполнилось 18/i }).check()
    await page.getByRole('button', { name: /создать аккаунт/i }).click()

    await expect(page).toHaveURL(/\/auth\/register/)
    await expect(page.getByText(/минимум\s+6|too\s+short/i).first()).toBeVisible()
  })
})
