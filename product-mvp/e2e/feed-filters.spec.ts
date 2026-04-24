/**
 * E2E 2.4 — Фильтры ленты.
 *
 * Seed-данные (seed-dev.sql):
 *   - Luna: «Город, которого нет на карте» (duo, fandom, gt)
 *   - Luna: «Таверна на перекрёстке» (multiplayer, original, any)
 *   - Wolf: «Хогвартс: тёмный семестр» (duo, fandom, sl)
 *   - Wolf: «Последнее письмо с маяка» (duo, original, any)
 *   - Ember: 2 заявки и т.д.
 *
 * Покрываем три кейса фильтрации:
 *   1. Текстовый поиск по заголовку.
 *   2. Тип игры (duo vs multiplayer) через FilterSelect.
 *   3. Сброс фильтра возвращает все заявки.
 */
import { test, expect } from '@playwright/test'

test.describe('Feed filters', () => {
  test('text search narrows results to matching titles', async ({ page }) => {
    await page.goto('/feed')

    // Дождёмся что seed-заявки прогрузились
    await expect(page.getByText('Город, которого нет на карте')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Хогвартс: тёмный семестр')).toBeVisible()

    await page.getByPlaceholder(/поиск по тексту/i).fill('хогвартс')

    // Загрузка дебаунсится через useEffect → load(). После debounce — Хогвартс есть, Города нет.
    await expect(page.getByText('Хогвартс: тёмный семестр')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Город, которого нет на карте')).toBeHidden({ timeout: 5_000 })
  })

  test('type=multiplayer filter hides duo requests', async ({ page }) => {
    await page.goto('/feed')
    await expect(page.getByText('Таверна на перекрёстке')).toBeVisible({ timeout: 10_000 })

    // Type-фильтр — FilterSelect с initial label "Любой тип". Кликаем кнопку → option "Мультиплеер".
    await page.getByRole('button', { name: 'Любой тип' }).click()
    await page.getByRole('option', { name: 'Мультиплеер' }).click()

    await expect(page.getByText('Таверна на перекрёстке')).toBeVisible()
    await expect(page.getByText('Город, которого нет на карте')).toBeHidden({ timeout: 5_000 })
    await expect(page.getByText('Хогвартс: тёмный семестр')).toBeHidden()
  })

  test('clearing search restores full feed', async ({ page }) => {
    await page.goto('/feed')
    const search = page.getByPlaceholder(/поиск по тексту/i)
    await search.fill('маяк')
    await expect(page.getByText('Последнее письмо с маяка')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Город, которого нет на карте')).toBeHidden()

    await search.fill('')
    await expect(page.getByText('Город, которого нет на карте')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Последнее письмо с маяка')).toBeVisible()
  })
})
