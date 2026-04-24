/**
 * E2E 2.2 — reset-password.
 *
 * Контекст: /api/auth/forgot-password — stub (501), email-отправка не реализована.
 * Поэтому тестируем оба слоя отдельно:
 *
 *   1. UI /auth/forgot-password: форма показывает ошибку notImplemented из 501.
 *   2. UI /auth/reset-password: валидный токен → ввод нового пароля → success →
 *      логин этим паролем работает. Токен вставляется прямо в БД, обход stub.
 *
 * Юзер — свежий (registerFreshUser нет, регистрируем через API), чтобы не
 * ломать seed-пароли для других тестов.
 */
import { test, expect } from '@playwright/test'
import { findUserIdByEmail, insertResetToken } from './fixtures/db'

function freshEmail() {
  return `e2e-reset-${crypto.randomUUID().slice(0, 8)}@apocryph.test`
}

test.describe('Reset password', () => {
  test('forgot-password form surfaces notImplemented when email sending is stubbed', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await page.locator('input[type="email"]').fill('luna@apocryph.test')
    await page.getByRole('button', { name: /отправить ссылку/i }).click()

    // UI остаётся на той же странице и показывает сообщение об ошибке.
    // (Текст может быть либо errors.notImplemented, либо networkError — оба ок.)
    await expect(page).toHaveURL(/\/auth\/forgot-password/)
    await expect(
      page.getByText(/не\s?реализован|not\s?implemented|network|ошибк/i).first(),
    ).toBeVisible({ timeout: 5_000 })
  })

  test('user can set a new password via a valid reset token', async ({ page, request }) => {
    // 1. Регистрируем свежего юзера через API.
    const email = freshEmail()
    const oldPassword = 'e2e-old-password-111'
    const newPassword = 'e2e-new-password-222'

    const reg = await request.post('/api/auth/register', {
      data: { email, password: oldPassword },
    })
    expect(reg.ok(), await reg.text()).toBeTruthy()

    // 2. Вставляем reset-токен напрямую в БД (forgot-password stub).
    const userId = await findUserIdByEmail(email)
    expect(userId, `user with email ${email} not found`).not.toBeNull()
    const token = `e2e-token-${crypto.randomUUID()}`
    await insertResetToken(userId!, token)

    // 3. Идём на /auth/reset-password?token=... и вводим новый пароль.
    await page.goto(`/auth/reset-password?token=${encodeURIComponent(token)}`)
    // Two `input[type="password"]` fields on this page: «Новый пароль» and «Повторите пароль».
    const passwordInputs = page.locator('input[type="password"]')
    await passwordInputs.nth(0).fill(newPassword)
    await passwordInputs.nth(1).fill(newPassword)
    await page.getByRole('button', { name: /сменить пароль/i }).click()

    // 4. Success-сообщение видно, через 3 сек компонент редиректит на login.
    await expect(page.getByText(/пароль изменён/i)).toBeVisible({ timeout: 5_000 })

    // 5. Логинимся новым паролем.
    await page.goto('/auth/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(newPassword)
    await page.getByRole('button', { name: /^войти/i }).click()
    await page.waitForURL(/\/feed/, { timeout: 10_000 })
  })

  test('reset-password rejects expired/invalid token', async ({ page }) => {
    // Токен в URL, но в БД его нет — форма отправит запрос и получит resetExpired.
    await page.goto(`/auth/reset-password?token=not-a-real-token-${Date.now()}`)
    const passwordInputs = page.locator('input[type="password"]')
    await passwordInputs.nth(0).fill('some-new-password')
    await passwordInputs.nth(1).fill('some-new-password')
    await page.getByRole('button', { name: /сменить пароль/i }).click()

    await expect(
      page.getByText(/ссылка истекла|недействительн|expired|invalid/i).first(),
    ).toBeVisible({ timeout: 5_000 })
  })
})
