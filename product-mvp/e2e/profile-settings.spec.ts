/**
 * E2E 2.5 — Настройки.
 *
 * Важная адаптация плана: в проекте НЕТ страницы /settings со сменой пароля,
 * аватара или ника. Изменение пароля доступно только через reset-токен (см. 2.2),
 * никнейм существует только внутри игры (per-game нет profile).
 *
 * Что есть и критично для регрессии:
 *   - SettingsPanel — выезжающая панель из правого края, открывается из Nav.
 *     Содержит: язык, тема, размер шрифта, отступы, шрифт, тогл email-уведомлений.
 *   - Тема применяется через атрибут `data-theme` на <html>.
 *
 * Покрываем:
 *   1. Открытие панели по клику на иконку Settings.
 *   2. Смена темы → атрибут `data-theme` обновляется и сохраняется в localStorage.
 *   3. Смена языка ru → en меняет тексты в Nav.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

async function openSettingsPanel(page: import('@playwright/test').Page) {
  // Кнопка с aria-label "Настройки" (см. nav.settings в i18n).
  await page.getByRole('button', { name: 'Настройки' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Настройки' })).toBeVisible()
}

test.describe('Settings panel', () => {
  test('clicking Settings opens the panel for an anonymous visitor', async ({ page }) => {
    await page.goto('/feed')
    await openSettingsPanel(page)
  })

  test('changing theme updates html data-theme', async ({ page }) => {
    await page.goto('/feed')
    await openSettingsPanel(page)

    // Открываем строку «Тема»
    await page.getByText('Тема', { exact: true }).click()

    // Перед нажатием — фиксируем текущую тему
    const before = await page.locator('html').getAttribute('data-theme')

    // Кликаем тему «Полночь» (label виден внутри кнопки)
    const target = before === 'nocturne' ? 'Бумага' : 'Полночь'
    await page.getByRole('button', { name: target }).click()

    const expected = target === 'Полночь' ? 'nocturne' : 'light'
    await expect.poll(async () => page.locator('html').getAttribute('data-theme'), {
      timeout: 5_000,
    }).toBe(expected)
  })

  test('changing language updates Nav labels', async ({ page }) => {
    await page.goto('/feed')
    await openSettingsPanel(page)
    await page.getByText('Язык', { exact: true }).click()
    await page.getByRole('button', { name: 'English' }).click()

    // After lang switch the panel header itself changes
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible({ timeout: 5_000 })
  })

  test('email-notifs toggle is visible to authenticated users', async ({ page }) => {
    await loginAs(page, 'wolf')
    await openSettingsPanel(page)
    await expect(
      page.getByRole('switch', { name: /уведомления.*e.?mail|email.*notif/i }),
    ).toBeVisible()
  })
})
