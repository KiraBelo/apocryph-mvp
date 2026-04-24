/**
 * E2E 2.3 — Создание заявки.
 *
 * Форма `/requests/new` использует несколько нетривиальных UI-компонентов
 * (кастомный FilterSelect, TipTap RichEditor, TagAutocomplete с модалкой
 * выбора категории). Полный happy-path через UI получается хрупким.
 *
 * Стратегия Phase 2:
 *   - UI validation: пустая форма → inline-ошибки (title/selects).
 *   - UI-smoke: форма рендерится залогиненному и редиректит анонима.
 *   - API happy-path: POST /api/requests от имени залогиненного юзера создаёт
 *     заявку → она видна на /my/requests (status=active или draft в
 *     зависимости от payload). Это покрывает регрессию «публикация работает
 *     и появляется в моих заявках».
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

test.describe('Create request', () => {
  test('anon user is redirected from /requests/new to login', async ({ page }) => {
    await page.goto('/requests/new')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('empty form surfaces validation errors', async ({ page }) => {
    await loginAs(page, 'ember')
    await page.goto('/requests/new')
    await page.getByRole('button', { name: /опубликовать заявку/i }).click()

    await expect(page).toHaveURL(/\/requests\/new/)
    // title errorNoTitle + selects errorAllSelects + (для active) errorMinTags
    // Достаточно убедиться что хотя бы одно сообщение с role=alert появилось.
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 3_000 })
  })

  test('draft save via UI button writes to my/requests', async ({ page }) => {
    await loginAs(page, 'ember')
    await page.goto('/requests/new')

    const title = `E2E draft ${Date.now()}`
    // Title input: filter-input class, placeholder form.titlePlaceholder = "Коротко и ёмко..."
    await page.getByPlaceholder(/коротко и ёмко/i).fill(title)

    // Saving as draft — ровно один кликабельный элемент с "Сохранить черновик"
    await page.getByRole('button', { name: /сохранить.*черновик|save.*draft/i }).click()

    // Ждём редирект на /my/requests?tab=draft
    await page.waitForURL(/\/my\/requests.*tab=draft/, { timeout: 10_000 })
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 })
  })

  test('published request via API appears in /my/requests', async ({ page, request }) => {
    // Заходим через ember (свежая сессия), чтобы не задеть seed-заявки Luna/Wolf.
    await loginAs(page, 'ember')

    const title = `E2E publish ${Date.now()}`
    const res = await request.post('/api/requests', {
      data: {
        title,
        description: '<p>E2E created via API to test /my/requests visibility.</p>',
        type: 'duo',
        fandom_type: 'original',
        pairing: 'any',
        content_level: 'none',
        language: 'ru',
        tags: ['e2e-one', 'e2e-two', 'e2e-three'],
        structured_tags: [],
        is_public: true,
        status: 'active',
      },
    })
    expect(res.ok(), `POST /api/requests failed: ${res.status()} ${await res.text()}`).toBeTruthy()
    const body = await res.json()
    expect(body.id).toBeTruthy()

    await page.goto('/my/requests?tab=active')
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 })
  })
})
