/**
 * Smoke test — проверяет что dev-сервер поднимается и главная отдаётся.
 * Если этот тест красный — вся E2E инфраструктура не работает.
 */
import { test, expect } from '@playwright/test'

test('homepage loads without errors', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/')
  await expect(page).toHaveTitle(/апокриф|apocryph/i)
  expect(consoleErrors).toEqual([])
})
