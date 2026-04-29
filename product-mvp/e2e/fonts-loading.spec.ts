/**
 * E2E — Lazy-loading шрифтов.
 *
 * Покрываем поведение:
 *   1. Initial page load НЕ содержит legacy 18-font Google Fonts <link>.
 *      Раньше layout грузил все 18 семейств одним preload-запросом
 *      (~600 КБ); сейчас критичные шрифты идут через next/font (self-hosted),
 *      остальные — лениво.
 *   2. Пользователь с сохранённым siteFont=Lora получает <link> для Lora
 *      сразу при первой отрисовке (FOUC-bootstrap-скрипт в head). Без этого
 *      перезагрузка страницы давала бы мигание Georgia → Lora.
 *   3. При раскрытии секции «Шрифт» в SettingsPanel в head добавляется
 *      батч-<link> со всеми лениво подгружаемыми семействами, чтобы
 *      пользователь видел превью шрифтов в выпадашке.
 */
import { test, expect } from '@playwright/test'

test.describe('fonts: lazy loading', () => {
  test('initial page load does not include the legacy 18-font Google Fonts link', async ({ page }) => {
    await page.goto('/feed')
    const hrefs = await page.locator('link[rel="stylesheet"][href*="fonts.googleapis.com"]').evaluateAll(
      (els) => (els as HTMLLinkElement[]).map((el) => el.href),
    )
    for (const href of hrefs) {
      expect(href, `Initial page must not preload Google Fonts catalog: ${href}`).not.toMatch(
        /Lora|PT\+Serif|Playfair|Merriweather|Crimson|Caveat|Raleway|PT\+Sans|Roboto|Open\+Sans|Nunito|Montserrat|Neucha|Marck/,
      )
    }
  })

  test('FOUC bootstrap loads saved siteFont before first paint', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('apocryph-site-font', 'Lora, Georgia, serif')
    })
    await page.goto('/feed')

    const loraLink = page.locator('link[rel="stylesheet"][href*="family=Lora"]')
    await expect(loraLink).toHaveCount(1)

    // CSS-переменная siteFont выставлена на html — значит шрифт уже применён.
    const siteFontVar = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--site-font'),
    )
    expect(siteFontVar).toContain('Lora')
  })

  test('opening the «Шрифт» row in settings triggers catalog batch load', async ({ page }) => {
    await page.goto('/feed')

    await page.getByRole('button', { name: 'Настройки' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Настройки' })).toBeVisible()

    await page.getByRole('button', { name: 'Шрифт', exact: true }).click()

    const catalogLink = page.locator(
      'link[rel="stylesheet"][href*="family=Lora"][href*="family=Caveat"]',
    )
    await expect(catalogLink).toHaveCount(1)
  })
})
