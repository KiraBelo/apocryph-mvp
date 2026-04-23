# TDD Adoption — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поставить и настроить инфраструктуру для TDD: vitest workspace (server + client), React Testing Library, Playwright, MSW, husky + lint-staged, GitHub Actions CI. В конце 238 существующих backend-тестов должны пройти, клиентский проект должен иметь 1 gold-standard тест, Playwright должен иметь 1 gold-standard E2E, CI должен быть зелёный.

**Architecture:** Один корневой `vitest.config.ts` с полем `projects` определяет два проекта: `server` (environment node, setup.ts с env-переменными) и `client` (environment jsdom, setup-client.ts с jest-dom + MSW + MockEventSource). Playwright конфигурируется отдельно в `playwright.config.ts` с webServer, поднимающим `npm run dev`. Pre-commit через husky+lint-staged запускает `vitest related` только на изменённые файлы. CI через GitHub Actions с Postgres service container.

**Tech Stack:** vitest 4.1, @testing-library/react, jsdom, msw, @playwright/test, husky, lint-staged, GitHub Actions, PostgreSQL.

**Spec:** [`docs/superpowers/specs/2026-04-21-tdd-adoption-design.md`](../specs/2026-04-21-tdd-adoption-design.md)

---

## File Structure

**Новые файлы:**
- `vitest.config.ts` — корневой конфиг с projects (заменяет текущий)
- `src/test/setup-client.ts` — JSDOM setup: jest-dom, MSW server, MockEventSource, next-моки
- `src/test/test-utils.tsx` — render-with-providers (ThemeProvider, SettingsProvider, ToastProvider)
- `src/test/mocks/db.ts` — вспомогательный мок для `@/lib/db`
- `src/test/mocks/session.ts` — вспомогательный мок для `@/lib/session`
- `src/test/mocks/next.ts` — моки `next/navigation`, `next/headers`
- `src/test/mocks/handlers.ts` — default MSW handlers (пустой список, расширяется в тестах)
- `src/test/mocks/server.ts` — экспорт MSW server
- `playwright.config.ts` — E2E конфиг
- `e2e/fixtures/db.ts` — helper для пересоздания тестовой БД
- `e2e/fixtures/auth.ts` — helper для логина seed-юзеров
- `e2e/smoke.spec.ts` — минимальный gold-standard E2E-тест
- `.conventions/gold-standards/component-test.test.tsx` — gold-standard для клиентского компонент-теста
- `.conventions/gold-standards/integration-test.test.tsx` — gold-standard для integration-теста с MSW
- `.conventions/gold-standards/e2e-test.spec.ts` — gold-standard для E2E
- `.husky/pre-commit` — pre-commit hook
- `.github/workflows/ci.yml` — CI pipeline
- `scripts/setup-test-db.sh` — bash-скрипт для создания `apocryph_test`

**Модифицируемые файлы:**
- `package.json` — добавить scripts, devDependencies, lint-staged конфиг
- `src/test/setup.ts` — без изменений (остаётся server setup)
- `.gitignore` — добавить `test-results/`, `playwright-report/`, `playwright/.cache`

**Удаляется:**
- `vitest.config.ts` (старый) — содержимое переносится в новый корневой конфиг

---

## Task 1: Установка клиентских test-dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Установить пакеты для клиентских тестов**

```bash
cd product-mvp
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom @testing-library/dom jsdom
```

Expected: пакеты добавлены в `package.json` раздел `devDependencies`, `package-lock.json` обновлён. Без ошибок установки.

- [ ] **Step 2: Установить MSW**

```bash
npm install --save-dev msw
```

Expected: `msw` в devDependencies.

- [ ] **Step 3: Установить Playwright**

```bash
npm install --save-dev @playwright/test
npx playwright install chromium --with-deps
```

Expected: `@playwright/test` в devDependencies. Chromium скачан. Команда `npx playwright --version` печатает версию без ошибок.

- [ ] **Step 4: Установить husky и lint-staged**

```bash
npm install --save-dev husky lint-staged
```

Expected: оба в devDependencies.

- [ ] **Step 5: Проверить что существующие тесты всё ещё проходят**

```bash
npx vitest run
```

Expected: 238 тестов зелёные (или столько же, сколько было до изменений). Никакой регрессии.

- [ ] **Step 6: Коммит**

```bash
git add package.json package-lock.json
git commit -m "chore(test): add RTL, jsdom, Playwright, MSW, husky, lint-staged dev-deps"
```

---

## Task 2: Миграция vitest в workspace-формат (projects)

**Files:**
- Modify: `vitest.config.ts` (переписать с нуля под projects)

- [ ] **Step 1: Переписать корневой `vitest.config.ts` под projects**

Заменить содержимое файла `product-mvp/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          setupFiles: ['./src/test/setup.ts'],
          include: [
            'src/**/__tests__/**/*.test.ts',
            'src/**/*.server.test.ts',
          ],
          exclude: ['node_modules', '.next', 'e2e'],
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup-client.ts'],
          include: [
            'src/**/*.test.tsx',
            'src/**/__tests_client__/**/*.test.ts',
          ],
          exclude: ['node_modules', '.next', 'e2e'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      exclude: ['node_modules', '.next', 'e2e', '**/*.config.*', 'src/test/**'],
    },
  },
})
```

- [ ] **Step 2: Временно создать пустой `src/test/setup-client.ts` (чтобы проект client не падал)**

Создать файл `product-mvp/src/test/setup-client.ts`:

```ts
// Client-side test setup. Filled in Task 4.
export {}
```

- [ ] **Step 3: Запустить тесты и убедиться что server-проект зелёный**

```bash
npx vitest run --project server
```

Expected: все 238 тестов в server-проекте зелёные. Имя проекта появляется в выводе (`RUN  server`).

- [ ] **Step 4: Запустить клиентский проект — он пустой, но не должен падать**

```bash
npx vitest run --project client
```

Expected: `No test files found` или `0 passed`. Без ошибок.

- [ ] **Step 5: Запустить всё**

```bash
npx vitest run
```

Expected: общий вывод перечисляет оба проекта, 238 тестов зелёные.

- [ ] **Step 6: Коммит**

```bash
git add vitest.config.ts src/test/setup-client.ts
git commit -m "test: migrate vitest to projects workspace (server + client)"
```

---

## Task 3: npm scripts для новых test-команд

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Обновить секцию scripts в `package.json`**

Найти раздел `"scripts"` в `product-mvp/package.json` и заменить на:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:server": "vitest run --project server",
    "test:client": "vitest run --project client",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e",
    "prepare": "husky"
  },
```

- [ ] **Step 2: Проверить что каждая команда запускается (без e2e — ещё не настроено)**

```bash
npm run test:server
```

Expected: 238 тестов зелёные.

```bash
npm run test:client
```

Expected: клиентский проект выполняется, 0 тестов.

```bash
npm test
```

Expected: оба проекта прогоняются, 238 тестов.

```bash
npm run typecheck
```

Expected: без ошибок (либо те же ошибки что были до изменений — не регрессируем).

- [ ] **Step 3: Коммит**

```bash
git add package.json
git commit -m "chore(test): add test:server, test:client, test:e2e, test:all scripts"
```

---

## Task 4: Client setup — jest-dom, MSW, MockEventSource, next-моки

**Files:**
- Modify: `src/test/setup-client.ts`
- Create: `src/test/mocks/handlers.ts`
- Create: `src/test/mocks/server.ts`
- Create: `src/test/mocks/next.ts`

- [ ] **Step 1: Создать пустой список MSW-handlers**

Создать файл `product-mvp/src/test/mocks/handlers.ts`:

```ts
import { http } from 'msw'

// Default handlers. Empty — tests add their own via server.use() per-test.
// Shared handlers that should apply to every client test can go here.
export const handlers: ReturnType<typeof http.get>[] = []
```

- [ ] **Step 2: Создать MSW server**

Создать файл `product-mvp/src/test/mocks/server.ts`:

```ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

- [ ] **Step 3: Создать моки next/navigation и next/headers**

Создать файл `product-mvp/src/test/mocks/next.ts`:

```ts
import { vi } from 'vitest'

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

export const mockPathname = vi.fn(() => '/')
export const mockSearchParams = vi.fn(() => new URLSearchParams())

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => {
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    return <a href={href} {...rest}>{children}</a>
  },
}))
```

**Примечание:** файл содержит JSX, поэтому расширение должно быть `.tsx`. Переименовать при сохранении в `src/test/mocks/next.tsx`.

- [ ] **Step 4: Заполнить setup-client.ts**

Заменить содержимое `product-mvp/src/test/setup-client.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './mocks/server'
import './mocks/next'

// Fixed time zone and system time for deterministic tests.
process.env.TZ = 'UTC'

// Mock EventSource for SSE-based client code.
class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  readyState = 1 // OPEN
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onopen: ((event: Event) => void) | null = null
  private listeners: Record<string, ((event: MessageEvent) => void)[]> = {}

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, handler: (event: MessageEvent) => void) {
    ;(this.listeners[type] ??= []).push(handler)
  }

  removeEventListener(type: string, handler: (event: MessageEvent) => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((h) => h !== handler)
  }

  close() {
    this.readyState = 2 // CLOSED
  }

  // Test helpers — call from tests to simulate server events.
  dispatchMessage(data: unknown) {
    const event = new MessageEvent('message', { data: JSON.stringify(data) })
    this.onmessage?.(event)
    this.listeners.message?.forEach((h) => h(event))
  }

  dispatchTyped(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    this.listeners[type]?.forEach((h) => h(event))
  }

  dispatchError() {
    this.onerror?.(new Event('error'))
  }
}

;(globalThis as unknown as { EventSource: typeof EventSource }).EventSource =
  MockEventSource as unknown as typeof EventSource

// Start MSW before all tests, reset handlers between tests, close after all.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  MockEventSource.instances = []
  vi.clearAllMocks()
})
afterAll(() => server.close())

export { MockEventSource }
```

- [ ] **Step 5: Проверить что setup грузится без ошибок**

```bash
npm run test:client
```

Expected: выполняется успешно, 0 тестов. Никаких ошибок импорта MSW или jest-dom.

- [ ] **Step 6: Коммит**

```bash
git add src/test/setup-client.ts src/test/mocks/handlers.ts src/test/mocks/server.ts src/test/mocks/next.tsx
git commit -m "test: add client test setup (jest-dom, MSW, MockEventSource, next mocks)"
```

---

## Task 5: Test utilities — render-with-providers

**Files:**
- Create: `src/test/test-utils.tsx`

- [ ] **Step 1: Создать test-utils.tsx**

Создать файл `product-mvp/src/test/test-utils.tsx`:

```tsx
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactElement, type ReactNode } from 'react'

// Providers that wrap every rendered component.
// Extend this list when components need ThemeProvider, SettingsProvider, ToastProvider, etc.
function AllProviders({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  }
}

// Re-export everything else from RTL so tests only import from test-utils.
export * from '@testing-library/react'
```

- [ ] **Step 2: Проверить что файл компилируется**

```bash
npm run typecheck
```

Expected: без ошибок (или те же что были до задачи).

- [ ] **Step 3: Коммит**

```bash
git add src/test/test-utils.tsx
git commit -m "test: add renderWithProviders helper"
```

---

## Task 6: Gold standard — client component test (Breadcrumbs)

**Files:**
- Create: `.conventions/gold-standards/component-test.test.tsx`

- [ ] **Step 1: Написать тест**

Создать файл `product-mvp/.conventions/gold-standards/component-test.test.tsx`:

```tsx
/**
 * GOLD STANDARD: клиентский компонент-тест
 *
 * Проверяет поведение небольшого компонента в изоляции.
 * Всегда импортируем render/screen из `@/test/test-utils`, не напрямую из RTL.
 * Тест написан на ПОВЕДЕНИЕ (что видит пользователь), не на внутренности.
 */
import { describe, it, expect } from 'vitest'
import Breadcrumbs from '@/components/Breadcrumbs'
import { renderWithProviders, screen } from '@/test/test-utils'

describe('Breadcrumbs', () => {
  it('renders each item in order', () => {
    renderWithProviders(
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Заявки' }]} />,
    )

    expect(screen.getByText('Главная')).toBeInTheDocument()
    expect(screen.getByText('Заявки')).toBeInTheDocument()
  })

  it('renders linked items as anchors', () => {
    renderWithProviders(
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }]} />,
    )

    const link = screen.getByRole('link', { name: 'Главная' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('marks the last item without href as current page', () => {
    renderWithProviders(
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Заявки' }]} />,
    )

    expect(screen.getByText('Заявки')).toHaveAttribute('aria-current', 'page')
  })

  it('uses Breadcrumb landmark for accessibility', () => {
    renderWithProviders(<Breadcrumbs items={[{ label: 'Home' }]} />)

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить тест — ожидать что он проходит**

```bash
npx vitest run .conventions/gold-standards/component-test.test.tsx
```

Expected: 4 теста зелёные. Если Breadcrumbs.tsx изменился — адаптировать тест под реальный API, поведение остаётся тем же.

- [ ] **Step 3: Убедиться что общий прогон всё ещё зелёный**

```bash
npm test
```

Expected: 238 + 4 = 242 тестов зелёные.

- [ ] **Step 4: Коммит**

```bash
git add .conventions/gold-standards/component-test.test.tsx
git commit -m "test: gold standard — client component test (Breadcrumbs)"
```

---

## Task 7: Gold standard — integration test с MSW

**Files:**
- Create: `.conventions/gold-standards/integration-test.test.tsx`

- [ ] **Step 1: Написать тест**

Создать файл `product-mvp/.conventions/gold-standards/integration-test.test.tsx`:

```tsx
/**
 * GOLD STANDARD: integration-тест с MSW
 *
 * Проверяет взаимодействие компонента с API: компонент делает fetch,
 * MSW перехватывает запрос и отдаёт мок-ответ, UI обновляется,
 * тест проверяет что пользователь видит правильный результат.
 *
 * Используем inline test-component для демонстрации паттерна.
 * В реальных тестах импортируем настоящий компонент из src/components.
 */
import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { useEffect, useState } from 'react'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { server } from '@/test/mocks/server'

interface Tag {
  id: string
  name: string
}

function TagList() {
  const [tags, setTags] = useState<Tag[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tags?q=test')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { tags: Tag[] }) => setTags(data.tags))
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <p role="alert">Ошибка: {error}</p>
  if (!tags) return <p>Загрузка…</p>
  if (tags.length === 0) return <p>Нет тегов</p>
  return (
    <ul>
      {tags.map((t) => (
        <li key={t.id}>{t.name}</li>
      ))}
    </ul>
  )
}

describe('TagList (integration with MSW)', () => {
  it('renders tags from API', async () => {
    server.use(
      http.get('/api/tags', () =>
        HttpResponse.json({ tags: [{ id: '1', name: 'drama' }, { id: '2', name: 'fantasy' }] }),
      ),
    )

    renderWithProviders(<TagList />)

    expect(screen.getByText('Загрузка…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('drama')).toBeInTheDocument())
    expect(screen.getByText('fantasy')).toBeInTheDocument()
  })

  it('shows empty state when API returns no tags', async () => {
    server.use(
      http.get('/api/tags', () => HttpResponse.json({ tags: [] })),
    )

    renderWithProviders(<TagList />)

    await waitFor(() => expect(screen.getByText('Нет тегов')).toBeInTheDocument())
  })

  it('shows error when API fails', async () => {
    server.use(
      http.get('/api/tags', () => new HttpResponse(null, { status: 500 })),
    )

    renderWithProviders(<TagList />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('500')
    })
  })
})
```

- [ ] **Step 2: Запустить тест**

```bash
npx vitest run .conventions/gold-standards/integration-test.test.tsx
```

Expected: 3 теста зелёные. MSW перехватывает запрос, UI обновляется, assertions проходят.

- [ ] **Step 3: Коммит**

```bash
git add .conventions/gold-standards/integration-test.test.tsx
git commit -m "test: gold standard — integration test with MSW"
```

---

## Task 8: Скрипт создания тестовой БД

**Files:**
- Create: `scripts/setup-test-db.sh`
- Modify: `.gitignore`

- [ ] **Step 1: Создать скрипт setup-test-db.sh**

Создать файл `product-mvp/scripts/setup-test-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Creates or recreates apocryph_test database for E2E and integration tests.
# Uses DATABASE_URL_TEST if set, falls back to postgres://postgres:postgres@localhost:5432/apocryph_test.

DB_URL="${DATABASE_URL_TEST:-postgresql://postgres:postgres@localhost:5432/apocryph_test}"

# Extract db name from URL (last path segment, no query)
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^/?]+).*|\1|')
# URL without database (for connecting to postgres admin db)
ADMIN_URL=$(echo "$DB_URL" | sed -E 's|(.*)/[^/?]+|\1/postgres|')

echo "[setup-test-db] Resetting database: $DB_NAME"

psql "$ADMIN_URL" -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
psql "$ADMIN_URL" -c "CREATE DATABASE \"$DB_NAME\";"

echo "[setup-test-db] Applying schema.sql"
psql "$DB_URL" -f schema.sql

echo "[setup-test-db] Applying seed-dev.sql"
psql "$DB_URL" -f seed-dev.sql

echo "[setup-test-db] Done."
```

Сделать исполняемым:

```bash
chmod +x scripts/setup-test-db.sh
```

- [ ] **Step 2: Добавить в package.json**

Найти секцию `"scripts"` в `package.json` и добавить строку:

```json
    "test:db:reset": "bash scripts/setup-test-db.sh",
```

- [ ] **Step 3: Обновить .gitignore**

Добавить в конец `product-mvp/.gitignore`:

```
# Playwright
test-results/
playwright-report/
playwright/.cache/
```

- [ ] **Step 4: Проверить что скрипт работает локально**

Убедиться что Postgres запущен локально на стандартном порту, затем:

```bash
npm run test:db:reset
```

Expected: скрипт печатает три строки прогресса и заканчивается «Done.» без ошибок. Если Postgres требует пароль — установить `PGPASSWORD` или использовать `.pgpass`.

Если локальный Postgres не настроен для этого — можно пропустить выполнение скрипта (CI всё равно поднимет свой) — главное чтобы файл был создан.

- [ ] **Step 5: Коммит**

```bash
git add scripts/setup-test-db.sh package.json .gitignore
git commit -m "test: add test-db setup script (apocryph_test)"
```

---

## Task 9: Playwright configuration + fixtures

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/fixtures/db.ts`
- Create: `e2e/fixtures/auth.ts`

- [ ] **Step 1: Создать playwright.config.ts**

Создать файл `product-mvp/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? 'postgresql://postgres:postgres@localhost:5432/apocryph_test',
      SESSION_SECRET: 'test-secret-key-at-least-32-characters-long',
      TRUSTED_PROXY: '1',
    },
  },
})
```

- [ ] **Step 2: Создать fixture для БД**

Создать файл `product-mvp/e2e/fixtures/db.ts`:

```ts
import { execSync } from 'node:child_process'

/**
 * Resets the test database to a clean state (schema + seed).
 * Call from globalSetup or per-describe beforeAll when isolation is needed.
 */
export function resetTestDb() {
  execSync('bash scripts/setup-test-db.sh', { stdio: 'inherit' })
}
```

- [ ] **Step 3: Создать fixture для логина**

Создать файл `product-mvp/e2e/fixtures/auth.ts`:

```ts
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
```

- [ ] **Step 4: Убедиться что Playwright видит конфиг**

```bash
npx playwright test --list
```

Expected: печатается список найденных тестов (пока пусто) без ошибок парсинга конфига.

- [ ] **Step 5: Коммит**

```bash
git add playwright.config.ts e2e/fixtures/db.ts e2e/fixtures/auth.ts
git commit -m "test: Playwright config + db/auth fixtures"
```

---

## Task 10: Gold standard — E2E smoke test

**Files:**
- Create: `e2e/smoke.spec.ts`
- Create: `.conventions/gold-standards/e2e-test.spec.ts`

- [ ] **Step 1: Создать smoke E2E тест**

Создать файл `product-mvp/e2e/smoke.spec.ts`:

```ts
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
```

- [ ] **Step 2: Создать gold-standard E2E**

Создать файл `product-mvp/.conventions/gold-standards/e2e-test.spec.ts`:

```ts
/**
 * GOLD STANDARD: E2E-тест
 *
 * Принципы:
 * - Никогда не используем page.waitForTimeout(). Только auto-waiting API (expect.toBeVisible).
 * - Используем семантические локаторы (getByRole, getByLabel), не CSS-классы.
 * - Логин через fixture loginAs(), не копипаста через заполнение формы.
 * - Каждый describe независим: не рассчитываем на состояние от предыдущего describe.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from '../../e2e/fixtures/auth'

test.describe('Feed page (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'luna')
  })

  test('user sees feed of requests after login', async ({ page }) => {
    await page.goto('/feed')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('create-request button is reachable from feed', async ({ page }) => {
    await page.goto('/feed')
    const createLink = page.getByRole('link', { name: /создать|новая заявка/i }).first()
    await expect(createLink).toBeVisible()
  })
})
```

- [ ] **Step 3: Перед запуском — убедиться что тестовая БД готова**

```bash
npm run test:db:reset
```

Expected: «Done.» без ошибок.

Если локально Postgres не настроен — пропустить этот шаг и следующий, проверка произойдёт в CI. Сказать об этом в коммит-сообщении или PR.

- [ ] **Step 4: Запустить E2E локально**

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/apocryph_test npm run test:e2e
```

Expected: Playwright поднимает dev-сервер, два smoke-теста + два gold-standard теста проходят. Если локальная среда БД не готова — пропустить, разберёмся в CI.

- [ ] **Step 5: Коммит**

```bash
git add e2e/smoke.spec.ts .conventions/gold-standards/e2e-test.spec.ts
git commit -m "test: gold standard — E2E smoke test + Playwright examples"
```

---

## Task 11: Husky + lint-staged

**Files:**
- Create: `.husky/pre-commit`
- Modify: `package.json`

- [ ] **Step 1: Инициализировать husky**

```bash
npx husky init
```

Expected: создаётся папка `.husky/` с файлом `pre-commit`, в `package.json` уже есть `"prepare": "husky"` (добавлено в Task 3).

- [ ] **Step 2: Настроить `.husky/pre-commit`**

Заменить содержимое `product-mvp/.husky/pre-commit`:

```sh
npx lint-staged
```

Сделать исполняемым:

```bash
chmod +x .husky/pre-commit
```

- [ ] **Step 3: Добавить lint-staged конфиг в package.json**

В корне `product-mvp/package.json` (на уровне "scripts") добавить поле `lint-staged`:

```json
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
```

- [ ] **Step 4: Проверить pre-commit**

Внести маленькое изменение в любой уже покрытый тестами файл (например, добавить пустую строку в `src/lib/game-utils.ts`):

```bash
echo "" >> src/lib/game-utils.ts
git add src/lib/game-utils.ts
git commit -m "test(husky): verify pre-commit hook runs lint-staged"
```

Expected: pre-commit запускает eslint и vitest related. Если всё зелёное — commit проходит. Время выполнения ≤10 сек.

Откатить изменение если оно не нужно:

```bash
git revert HEAD --no-edit
```

- [ ] **Step 5: Коммит настроек (если не закоммичены в Step 4)**

```bash
git add .husky/pre-commit package.json
git commit -m "chore: husky pre-commit hook with lint-staged (eslint + vitest related)"
```

---

## Task 12: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Создать CI workflow**

Создать файл `product-mvp/.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    name: Lint · Typecheck · Test · Build · E2E
    runs-on: ubuntu-latest
    timeout-minutes: 20

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_USER: postgres
          POSTGRES_DB: apocryph_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/apocryph_test
      DATABASE_URL_TEST: postgresql://postgres:postgres@localhost:5432/apocryph_test
      SESSION_SECRET: test-secret-key-at-least-32-characters-long
      TRUSTED_PROXY: '1'
      CI: 'true'

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
          cache-dependency-path: product-mvp/package-lock.json

      - name: Install dependencies
        working-directory: product-mvp
        run: npm ci

      - name: Wait for Postgres
        run: |
          for i in {1..30}; do
            pg_isready -h localhost -p 5432 -U postgres && break
            sleep 1
          done

      - name: Lint
        working-directory: product-mvp
        run: npm run lint

      - name: Typecheck
        working-directory: product-mvp
        run: npm run typecheck

      - name: Vitest (server + client)
        working-directory: product-mvp
        run: npm test

      - name: Next.js build
        working-directory: product-mvp
        run: npm run build

      - name: Reset test DB
        working-directory: product-mvp
        run: bash scripts/setup-test-db.sh

      - name: Install Playwright browsers
        working-directory: product-mvp
        run: npx playwright install chromium --with-deps

      - name: E2E tests
        working-directory: product-mvp
        run: npm run test:e2e

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: product-mvp/playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Проверить YAML-синтаксис**

```bash
npx --yes yaml-lint .github/workflows/ci.yml
```

Или просто `cat .github/workflows/ci.yml | head -10` и убедиться что нет табов (YAML требует пробелы).

Expected: файл валидный YAML.

- [ ] **Step 3: Пушнуть в feature-ветку и проверить что CI запускается**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions pipeline (lint, typecheck, test, build, e2e)"
git push origin HEAD
```

На GitHub открыть Actions и посмотреть, что workflow запустился. Первый прогон может упасть из-за environment quirks — читать логи, исправлять, пушить новый коммит.

Expected: в итоге workflow зелёный.

**Важно:** не мержить в main пока CI не станет зелёным.

---

## Task 13: Финальная проверка — всё работает вместе

**Files:**
- Modify: `package.json` (возможно)

- [ ] **Step 1: Запустить полный набор команд локально**

```bash
cd product-mvp
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: все четыре команды зелёные.

- [ ] **Step 2: Запустить E2E (если локальная БД доступна)**

```bash
npm run test:db:reset
npm run test:e2e
```

Expected: smoke + gold-standard E2E тесты проходят.

- [ ] **Step 3: Посмотреть CI результаты**

На GitHub убедиться что последний push в feature-ветку прошёл зелёным.

- [ ] **Step 4: Мёрж в main (через PR)**

Создать PR из feature-ветки в main. Убедиться что CI зелёный на PR. Мержить.

- [ ] **Step 5: Финальный коммит-сообщение для всей Phase 1 (если нужно)**

Если всё в одном PR — этот шаг сводится к описанию PR. Если делали серию прямых коммитов в main — этот шаг не нужен, историю не трогаем.

- [ ] **Step 6: Обновить спеку — отметить Phase 1 как завершённую**

Добавить в конец `docs/superpowers/specs/2026-04-21-tdd-adoption-design.md` секцию:

```markdown
## Phase 1 — Статус

**Завершено:** <дата-завершения>
**Коммит/PR:** <ссылка>
**Проверки:**
- [x] 238 существующих тестов проходят
- [x] 4 gold-standard теста (client + integration + smoke E2E + gold-standard E2E) проходят
- [x] CI зелёный
- [x] Pre-commit hook работает
```

- [ ] **Step 7: Финальный коммит**

```bash
git add docs/superpowers/specs/2026-04-21-tdd-adoption-design.md
git commit -m "docs(tdd): mark Phase 1 complete"
```

---

## После Phase 1

Phase 2 (9 E2E флоу) и Phase 3 (правило TDD + CLAUDE.md) получают свои отдельные implementation plans. Инфраструктура после Phase 1 готова принимать новые тесты без дополнительной настройки.
