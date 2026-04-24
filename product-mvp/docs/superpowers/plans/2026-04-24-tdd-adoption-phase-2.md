# TDD Adoption — Phase 2 Implementation Plan (9 критичных E2E)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Покрыть 9 критичных пользовательских флоу Апокрифа E2E-тестами Playwright, чтобы ни одно изменение в будущем не могло тихо сломать регистрацию, создание заявки, игру, публикацию или модерацию. Каждый флоу проходит end-to-end в реальном dev-сервере против тестовой Postgres-БД и зеленит CI.

**Architecture:** Playwright поднимает Next.js dev-сервер через `webServer` в `playwright.config.ts`, тестовая БД `apocryph_test` пересоздаётся из `schema.sql` + `seed-dev.sql` в `globalSetup` перед каждым прогоном, тесты изолируются через отдельные browser contexts (иногда несколько параллельно — для SSE-флоу в игре). Никаких `waitForTimeout`, только auto-waiting (`expect(locator).toBeVisible()`), только семантические локаторы (`getByRole`, `getByLabel`, `getByText`). Для реестра seed-юзеров с паролями и ролями — отдельный fixture `e2e/fixtures/users.ts`, на его основе строится `loginAs()` (уже есть в Phase 1).

**Tech Stack:** @playwright/test, Next.js 16 App Router, PostgreSQL 16, bash `scripts/setup-test-db.sh`, seed-dev.sql.

**Spec:** [`docs/superpowers/specs/2026-04-21-tdd-adoption-design.md`](../specs/2026-04-21-tdd-adoption-design.md) (раздел «Phase 2»)

---

## Seed-юзеры и admin

- `luna@apocryph.test` — **admin** (role='admin' в seed-dev.sql:235)
- `wolf@apocryph.test` — обычный юзер
- `ember@apocryph.test` — обычный юзер
- `starfall@apocryph.test` — обычный юзер
- Пароль для всех: `apocryph123`

Для флоу, где нужны две стороны одной игры, используем **luna + wolf** (в seed есть их заявки). Для флоу, где нужен admin-ревью, логинимся как luna и идём в `/admin`.

---

## Общие принципы E2E в этом проекте

1. **Никогда не использовать `page.waitForTimeout()`** — только `await expect(locator).toBeVisible()` / `toHaveText` / `toHaveURL`.
2. **Локаторы — семантические:** `getByRole('button', { name: /войти/i })`, `getByLabel(/email/i)`, `getByText('Создать заявку')`. Никаких CSS-классов или testid, если можно без них.
3. **Регистрация новых юзеров в тесте:** генерировать уникальный email через `crypto.randomUUID()` — не пересекаться между тестами и не засорять seed-данные.
4. **Авторизация:** для seed-юзеров — `loginAs(page, 'luna')` из `e2e/fixtures/auth.ts`. Для свежерегистрированных — логин по факту регистрации.
5. **Изоляция между тестами:** полагаемся на `globalSetup` (сброс БД перед прогоном всей сюиты) + на уникальность email'ов в пределах одного прогона. Между тестами в одной сюите БД не сбрасываем — это дорого. Тесты, которые СОЗДАЮТ данные, используют уникальные имена/email.
6. **Console errors:** smoke-тест уже проверяет, что нет console-errors. В остальных тестах — добавлять только если конкретная страница раньше спамила errors и это актуально.
7. **Retries:** в CI 2 retries, локально 0. Стабильный провал = баг, не flaky.

---

## File Structure

**Новые файлы:**
- `e2e/fixtures/users.ts` — реестр seed-юзеров (email, password, role)
- `e2e/fixtures/register.ts` — helper `registerFreshUser(page)` для генерации уникального юзера и прохождения регистрации
- `e2e/fixtures/request.ts` — helper `createRequest(page, data)` для быстрого создания заявки от имени залогиненного юзера (используется в play-game и publish-флоу)
- `e2e/global-setup.ts` — `globalSetup` для Playwright: сброс тестовой БД перед прогоном
- `e2e/auth.spec.ts` — 2.1
- `e2e/reset-password.spec.ts` — 2.2
- `e2e/create-request.spec.ts` — 2.3
- `e2e/feed-filters.spec.ts` — 2.4
- `e2e/profile-settings.spec.ts` — 2.5
- `e2e/respond-to-request.spec.ts` — 2.6
- `e2e/play-game.spec.ts` — 2.7 (два контекста, SSE)
- `e2e/publish-to-library.spec.ts` — 2.8
- `e2e/moderation.spec.ts` — 2.9

**Модифицируемые:**
- `e2e/fixtures/auth.ts` — `loginAs()` принимает новый параметр `'luna' | 'wolf' | 'ember' | 'starfall'` и читает credentials из `users.ts` (refactor, не меняя поведение существующих вызовов)
- `playwright.config.ts` — добавить `globalSetup: './e2e/global-setup.ts'`
- `docs/superpowers/specs/2026-04-21-tdd-adoption-design.md` — в конце файла отметить Phase 2 завершённой

**Удаляется:** ничего.

---

## Task 1: Ветка + users fixture + globalSetup

**Files:**
- Create: `e2e/fixtures/users.ts`
- Create: `e2e/global-setup.ts`
- Modify: `e2e/fixtures/auth.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Создать feature-ветку из main**

```bash
cd /c/Users/Pirozenka/Desktop/apocrif/2-3-MVP
git checkout main
git pull --ff-only origin main
git checkout -b feat/tdd-phase-2-e2e
```

Expected: на ветке `feat/tdd-phase-2-e2e`, `git status` чистый.

- [ ] **Step 2: Создать `e2e/fixtures/users.ts`**

```ts
export type SeedUserKey = 'luna' | 'wolf' | 'ember' | 'starfall'

export interface SeedUser {
  email: string
  password: string
  role: 'admin' | 'user'
}

export const SEED_PASSWORD = 'apocryph123'

export const SEED_USERS: Record<SeedUserKey, SeedUser> = {
  luna:     { email: 'luna@apocryph.test',     password: SEED_PASSWORD, role: 'admin' },
  wolf:     { email: 'wolf@apocryph.test',     password: SEED_PASSWORD, role: 'user' },
  ember:    { email: 'ember@apocryph.test',    password: SEED_PASSWORD, role: 'user' },
  starfall: { email: 'starfall@apocryph.test', password: SEED_PASSWORD, role: 'user' },
}
```

- [ ] **Step 3: Отрефакторить `e2e/fixtures/auth.ts` чтобы использовал users.ts**

Переписать содержимое `product-mvp/e2e/fixtures/auth.ts`:

```ts
import type { Page } from '@playwright/test'
import { SEED_USERS, type SeedUserKey } from './users'

/**
 * Logs in as a seed user via the /auth/login form.
 * Waits until redirected away from /auth/* (post-login target varies).
 */
export async function loginAs(page: Page, user: SeedUserKey = 'luna') {
  const creds = SEED_USERS[user]
  await page.goto('/auth/login')
  await page.getByLabel(/email/i).fill(creds.email)
  await page.getByLabel(/пароль/i).fill(creds.password)
  await page.getByRole('button', { name: /войти|login/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 10_000 })
}
```

- [ ] **Step 4: Создать `e2e/global-setup.ts`**

```ts
import { execSync } from 'node:child_process'

/**
 * Playwright global setup: reset test DB once before the whole suite.
 * Uses scripts/setup-test-db.sh (DROP + CREATE + schema.sql + seed-dev.sql).
 * Skipped if DATABASE_URL_TEST is not pointing at apocryph_test (safety).
 */
export default async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL ?? ''
  if (!/apocryph_test/.test(dbUrl)) {
    // eslint-disable-next-line no-console
    console.warn('[e2e global-setup] DATABASE_URL_TEST does not look like a test DB, skipping reset. URL:', dbUrl || '(empty)')
    return
  }
  // eslint-disable-next-line no-console
  console.log('[e2e global-setup] Resetting test DB via scripts/setup-test-db.sh…')
  execSync('bash scripts/setup-test-db.sh', { stdio: 'inherit' })
}
```

- [ ] **Step 5: Подключить globalSetup в `playwright.config.ts`**

В `product-mvp/playwright.config.ts` добавить строку в `defineConfig({...})` на верхнем уровне (рядом с `testDir`):

```ts
  globalSetup: './e2e/global-setup.ts',
```

Полный файл выглядит как:

```ts
import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
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

- [ ] **Step 6: Проверить что ничего не сломалось**

```bash
cd product-mvp
npm test
```

Expected: все unit/integration-тесты зелёные (Phase 1 + последующие коммиты). Изменения Task 1 затрагивают только E2E инфру.

```bash
npx playwright test --list
```

Expected: `smoke.spec.ts > homepage loads without errors`. Ошибок парсинга `globalSetup` нет.

- [ ] **Step 7: Коммит**

```bash
git add e2e/fixtures/users.ts e2e/fixtures/auth.ts e2e/global-setup.ts playwright.config.ts
git commit -m "test(e2e): users registry + globalSetup reset, refactor loginAs"
```

---

## Task 2: E2E 2.1 — auth (register → logout → login)

**Files:**
- Create: `e2e/auth.spec.ts`

Перед написанием — перечитать `src/app/auth/register/page.tsx` и `src/app/auth/login/page.tsx` чтобы узнать точные label'ы полей и текст кнопок. Если эти тексты меняются в i18n — выбирать getByLabel по regex без привязки к конкретному русскому слову (например, `/email|почта|e-?mail/i`).

- [ ] **Step 1: Прочитать register + login страницы**

```bash
cat product-mvp/src/app/auth/register/page.tsx | head -120
cat product-mvp/src/app/auth/login/page.tsx | head -120
```

Зафиксировать: точные label-тексты, тексты кнопок, наличие полей «подтверждение пароля», куда редиректит после регистрации/логина.

- [ ] **Step 2: Написать `e2e/auth.spec.ts`**

```ts
/**
 * E2E 2.1 — Регистрация → выход → логин.
 * Самый простой флоу, проверяет что инфраструктура Playwright вообще живая.
 */
import { test, expect } from '@playwright/test'

function freshEmail() {
  return `e2e-auth-${crypto.randomUUID().slice(0, 8)}@apocryph.test`
}

test.describe('Auth', () => {
  test('user can register, logout, and login again', async ({ page }) => {
    const email = freshEmail()
    const password = 'e2e-password-123'

    // Регистрация
    await page.goto('/auth/register')
    await page.getByLabel(/email|почта/i).fill(email)
    await page.getByLabel(/^пароль$/i).fill(password)
    // Если на форме есть поле «подтверждение» — тоже заполнить
    const confirm = page.getByLabel(/подтвержд|повтор/i)
    if (await confirm.count()) {
      await confirm.first().fill(password)
    }
    await page.getByRole('button', { name: /зарегистр|создать аккаунт|register/i }).click()

    // После успешной регистрации редирект не на /auth/*
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 10_000 })

    // Выход через Nav (кнопка/ссылка «выйти»)
    await page.getByRole('button', { name: /выйти|logout/i }).or(
      page.getByRole('link', { name: /выйти|logout/i }),
    ).first().click()
    await page.waitForURL(/\/(auth|$)/, { timeout: 10_000 })

    // Логин тем же юзером
    await page.goto('/auth/login')
    await page.getByLabel(/email|почта/i).fill(email)
    await page.getByLabel(/пароль/i).fill(password)
    await page.getByRole('button', { name: /войти|login/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 10_000 })

    // Убедиться что юзер залогинен: виден выход (или что-то, что показывается только авторизованному)
    await expect(
      page.getByRole('button', { name: /выйти|logout/i }).or(
        page.getByRole('link', { name: /выйти|logout/i }),
      ),
    ).toBeVisible()
  })

  test('login rejects wrong password', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel(/email|почта/i).fill('luna@apocryph.test')
    await page.getByLabel(/пароль/i).fill('definitely-not-the-password')
    await page.getByRole('button', { name: /войти|login/i }).click()

    // Ошибка видна (alert/role='alert' или просто текст), URL остаётся на /auth/login
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(
      page.getByText(/невер|неправ|invalid|wrong|ошибк/i).first(),
    ).toBeVisible({ timeout: 5_000 })
  })
})
```

- [ ] **Step 3: Запустить E2E**

```bash
cd product-mvp
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/apocryph_test \
  npx playwright test auth.spec.ts
```

Expected: 2 теста зелёные. Если локально Postgres без пароля — `PGPASSWORD=postgres` опциональный.

Если селекторы разошлись с реальной версткой — адаптировать `getByLabel` / `getByRole` regex. **Не меняем содержимое страниц ради теста** — тест подстраивается под текущий UI.

- [ ] **Step 4: Коммит**

```bash
git add e2e/auth.spec.ts
git commit -m "test(e2e): auth flow — register, logout, login (2.1)"
```

---

## Task 3: E2E 2.2 — reset-password

**Files:**
- Create: `e2e/reset-password.spec.ts`

Подсказка по реализации: `forgot-password` скорее всего создаёт токен в БД и должен был бы отправить email, но в dev-режиме email-отправка — заглушка (см. CLAUDE.md: «Stub endpoints должны возвращать 501»). Если `/api/auth/forgot-password` возвращает 501 — тестируем только UI до отправки запроса; сам reset-флоу тестируется прямым визитом на `/auth/reset-password?token=<валидный токен>` после программного получения токена из БД.

- [ ] **Step 1: Прочитать реализацию forgot/reset-password**

```bash
cat product-mvp/src/app/api/auth/forgot-password/route.ts
cat product-mvp/src/app/api/auth/reset-password/route.ts
cat product-mvp/src/app/auth/forgot-password/page.tsx
cat product-mvp/src/app/auth/reset-password/page.tsx
```

Зафиксировать:
- Возвращает ли `forgot-password` токен в ответе (в dev) или только пишет в БД?
- Есть ли таблица `password_reset_tokens` или что-то похожее?
- UI показывает ли токен / ссылку на dev-страницу / только сообщение «проверьте почту»?

- [ ] **Step 2: Решить стратегию теста исходя из прочитанного**

Два пути:
- **(A)** если `forgot-password` возвращает токен в ответе — тест делает `fetch` на API, получает токен, идёт на `/auth/reset-password?token=...`, вводит новый пароль, логинится новым.
- **(B)** если токен только в БД — тест ходит в БД из Node (`pg`) через импорт, читает последний токен для юзера, использует его.
- **(C)** если реализация — просто 501 stub — тест проверяет только UI до отправки: поле email → кнопка → inline-сообщение «мы отправили письмо» / 501-ошибка (Toast).

- [ ] **Step 3: Написать тест под выбранный путь**

Пример для пути (A), наиболее вероятного:

```ts
/**
 * E2E 2.2 — reset-password.
 * Юзер luna запрашивает reset → получает токен → меняет пароль → логинится новым.
 */
import { test, expect } from '@playwright/test'
import { SEED_USERS } from './fixtures/users'

test.describe('Reset password', () => {
  test('user can request reset and set new password via token', async ({ page, request }) => {
    const email = SEED_USERS.wolf.email // wolf — не admin, безопасно «ломать» пароль в тестах
    const newPassword = 'e2e-new-password-456'

    // 1. Запрашиваем reset
    const forgot = await request.post('/api/auth/forgot-password', {
      data: { email },
    })
    expect(forgot.ok()).toBeTruthy()
    const body = await forgot.json().catch(() => ({}))

    // Токен может быть либо в ответе (dev), либо его надо вытащить из БД
    const token = body.token ?? body.resetToken
    test.skip(!token, 'forgot-password не вернул токен — этот путь не реализован, тест неприменим')

    // 2. Открываем reset-страницу с токеном
    await page.goto(`/auth/reset-password?token=${encodeURIComponent(token)}`)
    await page.getByLabel(/новый пароль|new password/i).fill(newPassword)
    const confirm = page.getByLabel(/подтвержд|повтор/i)
    if (await confirm.count()) {
      await confirm.first().fill(newPassword)
    }
    await page.getByRole('button', { name: /сохранить|изменить|reset|submit/i }).click()

    // 3. После reset — редирект на login или автологин
    await page.waitForURL(/\/(auth\/login|feed|$)/, { timeout: 10_000 })

    // 4. Логин новым паролем
    await page.goto('/auth/login')
    await page.getByLabel(/email|почта/i).fill(email)
    await page.getByLabel(/пароль/i).fill(newPassword)
    await page.getByRole('button', { name: /войти|login/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 10_000 })

    // Вернуть пароль как было — чтобы другие тесты в этом же прогоне не падали
    await request.post('/api/auth/forgot-password', { data: { email } })
    // (детали rollback см. в Step 4)
  })
})
```

Путь (C) — fallback для stub:

```ts
test('forgot-password form shows confirmation after submit', async ({ page }) => {
  await page.goto('/auth/forgot-password')
  await page.getByLabel(/email|почта/i).fill('luna@apocryph.test')
  await page.getByRole('button', { name: /восстанов|отправ|submit|send/i }).click()
  await expect(
    page.getByText(/письм|email|проверь|отправл|sent/i).first(),
  ).toBeVisible({ timeout: 5_000 })
})
```

- [ ] **Step 4: Обеспечить rollback пароля (если путь A)**

Проблема: если тест сменил пароль wolf-у, последующие тесты в том же прогоне с `loginAs('wolf')` упадут. Решения (выбрать одно при реализации):
1. **Тест сам восстанавливает пароль через повторный reset + старый пароль.**
2. **Использовать свежерегистрированного юзера** вместо seed-wolf. Предпочтительнее — убирает взаимозависимость.
3. **Только smoke + путь (C),** если rollback сложен.

Рекомендация в реализации: **юзер 2** — зарегистрировать свежего юзера в начале теста через API `/api/auth/register` (или `registerFreshUser` helper из Task 6), потом менять ему пароль. Без rollback seed-данных.

- [ ] **Step 5: Запустить**

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/apocryph_test \
  npx playwright test reset-password.spec.ts
```

Expected: тесты зелёные. Если нет — адаптировать путь.

- [ ] **Step 6: Коммит**

```bash
git add e2e/reset-password.spec.ts
git commit -m "test(e2e): reset password flow (2.2)"
```

---

## Task 4: E2E 2.3 — create-request

**Files:**
- Create: `e2e/create-request.spec.ts`

- [ ] **Step 1: Прочитать форму создания заявки**

```bash
cat product-mvp/src/components/RequestForm.tsx | head -200
```

Зафиксировать: какие поля есть (title, body, type, content_level, fandom_type, pairing, language, tags), какие label'ы, где кнопка публикации, что показывает успешная публикация (редирект на `/requests/[id]`?).

- [ ] **Step 2: Написать `e2e/create-request.spec.ts`**

```ts
/**
 * E2E 2.3 — Создание заявки.
 * Логинимся как wolf → открываем форму → заполняем обязательные поля → публикуем →
 * оказываемся на странице заявки с введённым заголовком.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

test.describe('Create request', () => {
  test('authenticated user can publish a new request', async ({ page }) => {
    await loginAs(page, 'wolf')

    await page.goto('/requests/new')

    // Заголовок
    await page.getByLabel(/заголов|title/i).fill('E2E test — заявка на игру')

    // Тело (TipTap редактор или textarea)
    const body = page.getByLabel(/описан|текст|тело|body/i).first()
    if (await body.count()) {
      await body.fill('Это текст заявки, создан автоматическим тестом. '.repeat(5))
    } else {
      // TipTap: фокус по role=textbox
      await page.getByRole('textbox').last().click()
      await page.keyboard.type('Это текст заявки, создан автоматическим тестом. '.repeat(5))
    }

    // Тип — duo (дефолт, но убедимся)
    const typeDuo = page.getByRole('radio', { name: /дуо|duo/i })
    if (await typeDuo.count()) await typeDuo.first().check()

    // Фандом — original (чтобы не возиться со связкой fandom→pairing)
    const fandomOriginal = page.getByRole('radio', { name: /оригинал|original/i })
    if (await fandomOriginal.count()) await fandomOriginal.first().check()

    // Публикация
    await page.getByRole('button', { name: /опубликовать|публикац|submit|publish/i }).click()

    // Успех: редирект на /requests/[uuid] и заголовок виден
    await page.waitForURL(/\/requests\/[0-9a-f-]{36}/, { timeout: 10_000 })
    await expect(
      page.getByRole('heading', { name: /E2E test — заявка на игру/ }),
    ).toBeVisible()
  })

  test('form blocks publish when title is empty', async ({ page }) => {
    await loginAs(page, 'ember')
    await page.goto('/requests/new')

    await page.getByRole('button', { name: /опубликовать|публикац|submit|publish/i }).click()

    // Либо остались на странице формы (никакого редиректа),
    // либо inline-ошибка у заголовка
    await expect(page).toHaveURL(/\/requests\/new/)
  })
})
```

- [ ] **Step 3: Запустить и адаптировать под реальные селекторы**

```bash
npx playwright test create-request.spec.ts --headed
```

Флаг `--headed` — чтобы видеть как тест прогоняется и быстрее диагностировать расхождения с разметкой.

- [ ] **Step 4: Коммит**

```bash
git add e2e/create-request.spec.ts
git commit -m "test(e2e): create request flow (2.3)"
```

---

## Task 5: E2E 2.4 — feed-filters

**Files:**
- Create: `e2e/feed-filters.spec.ts`

- [ ] **Step 1: Прочитать FeedClient и API**

```bash
cat product-mvp/src/components/FeedClient.tsx | head -150
```

Посмотреть какие фильтры UI-уровня есть (type, fandom_type, pairing, content_level, tags) и как они кодируются в query string.

- [ ] **Step 2: Написать тест**

```ts
/**
 * E2E 2.4 — Фильтры ленты.
 * Seed содержит Luna (duo+fandom+сюжетно «Город»), Wolf (duo+fandom+«Хогвартс»),
 * Luna (multiplayer+original «Таверна»).
 * Проверяем: фильтр по type=multiplayer оставляет «Таверну», но скрывает «Город».
 */
import { test, expect } from '@playwright/test'

test.describe('Feed filters', () => {
  test('filtering by type=multiplayer hides duo requests', async ({ page }) => {
    await page.goto('/feed')

    // Дождаться что seed-заявки прогрузились
    await expect(page.getByText(/Город, которого нет на карте/)).toBeVisible()
    await expect(page.getByText(/Таверна на перекрёстке/)).toBeVisible()

    // Активировать фильтр type=multiplayer
    // UI: это radio-группа, чипы или select — адаптировать по месту
    const multiplayerFilter = page
      .getByRole('radio', { name: /мультиплеер|multiplayer/i })
      .or(page.getByRole('button', { name: /мультиплеер|multiplayer/i }))
      .first()
    await multiplayerFilter.click()

    // Duo-заявки скрыты, multiplayer — виден
    await expect(page.getByText(/Город, которого нет на карте/)).toBeHidden()
    await expect(page.getByText(/Таверна на перекрёстке/)).toBeVisible()
  })

  test('text search filters by title', async ({ page }) => {
    await page.goto('/feed')
    await expect(page.getByText(/Хогвартс: тёмный семестр/)).toBeVisible()

    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/поиск|search/i)).first()
    await search.fill('хогвартс')

    // Дебаунс: дождаться что «Город» исчез, а «Хогвартс» остался
    await expect(page.getByText(/Хогвартс: тёмный семестр/)).toBeVisible()
    await expect(page.getByText(/Город, которого нет на карте/)).toBeHidden()
  })
})
```

- [ ] **Step 3: Запустить**

```bash
npx playwright test feed-filters.spec.ts
```

- [ ] **Step 4: Коммит**

```bash
git add e2e/feed-filters.spec.ts
git commit -m "test(e2e): feed filters (2.4)"
```

---

## Task 6: E2E 2.5 — profile-settings

**Files:**
- Create: `e2e/profile-settings.spec.ts`
- Create: `e2e/fixtures/register.ts`

- [ ] **Step 1: Создать helper registerFreshUser**

`product-mvp/e2e/fixtures/register.ts`:

```ts
import type { Page } from '@playwright/test'

export interface FreshUser {
  email: string
  password: string
}

/**
 * Регистрирует уникального юзера через UI и оставляет его залогиненным.
 * Возвращает credentials для последующего логина.
 */
export async function registerFreshUser(page: Page, prefix = 'e2e'): Promise<FreshUser> {
  const email = `${prefix}-${crypto.randomUUID().slice(0, 8)}@apocryph.test`
  const password = 'e2e-password-000'

  await page.goto('/auth/register')
  await page.getByLabel(/email|почта/i).fill(email)
  await page.getByLabel(/^пароль$/i).fill(password)
  const confirm = page.getByLabel(/подтвержд|повтор/i)
  if (await confirm.count()) {
    await confirm.first().fill(password)
  }
  await page.getByRole('button', { name: /зарегистр|создать аккаунт|register/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 10_000 })

  return { email, password }
}
```

- [ ] **Step 2: Прочитать страницу настроек**

Структура проекта (см. CLAUDE.md) не указывает явно `/settings` или `/profile`. Найти:

```bash
grep -r "смена пароля\|change.password\|аватар" product-mvp/src/app product-mvp/src/components --include="*.tsx" -l | head -20
```

Зафиксировать путь и селекторы.

- [ ] **Step 3: Написать тест**

```ts
/**
 * E2E 2.5 — Настройки профиля.
 * Свежий юзер → открывает настройки → меняет пароль → логинится новым паролем.
 * Если в UI доступна смена email/аватара — покрываем и их.
 */
import { test, expect } from '@playwright/test'
import { registerFreshUser } from './fixtures/register'

test.describe('Profile settings', () => {
  test('user can change their password', async ({ page }) => {
    const user = await registerFreshUser(page, 'e2e-settings')

    // Найти путь настроек — уточнить в Step 2 и заменить
    await page.goto('/settings')

    await page.getByLabel(/текущий пароль|current password/i).fill(user.password)
    const newPassword = 'e2e-new-password-789'
    await page.getByLabel(/новый пароль|new password/i).fill(newPassword)
    const confirm = page.getByLabel(/подтвержд|повтор/i)
    if (await confirm.count()) {
      await confirm.first().fill(newPassword)
    }
    await page.getByRole('button', { name: /сохранить|изменить|submit/i }).click()

    // Успех: либо Toast, либо inline-подтверждение
    await expect(
      page.getByText(/обновл|сохранен|success|changed/i).first(),
    ).toBeVisible({ timeout: 5_000 })

    // Выйти и залогиниться новым паролем
    await page.getByRole('button', { name: /выйти|logout/i }).or(
      page.getByRole('link', { name: /выйти|logout/i }),
    ).first().click()
    await page.waitForURL(/\/(auth|$)/, { timeout: 10_000 })

    await page.goto('/auth/login')
    await page.getByLabel(/email|почта/i).fill(user.email)
    await page.getByLabel(/пароль/i).fill(newPassword)
    await page.getByRole('button', { name: /войти|login/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 10_000 })
  })
})
```

Если настройки рассыпаны (аватар/ник в одной форме, пароль в другой) — разнести на два теста.

- [ ] **Step 4: Запустить**

```bash
npx playwright test profile-settings.spec.ts
```

- [ ] **Step 5: Коммит**

```bash
git add e2e/profile-settings.spec.ts e2e/fixtures/register.ts
git commit -m "test(e2e): profile settings — change password (2.5)"
```

---

## Task 7: E2E 2.6 — respond-to-request

**Files:**
- Create: `e2e/respond-to-request.spec.ts`
- Create: `e2e/fixtures/request.ts`

- [ ] **Step 1: Создать helper createRequest**

`product-mvp/e2e/fixtures/request.ts`:

```ts
import type { APIRequestContext, Page } from '@playwright/test'
import { SEED_USERS, type SeedUserKey } from './users'

export interface CreateRequestInput {
  title: string
  body?: string
  type?: 'duo' | 'multiplayer'
  fandomType?: 'fandom' | 'original'
  contentLevel?: 'none' | 'rare' | 'often'
  language?: 'ru' | 'en' | 'es' | 'pt'
  tags?: string[]
}

/**
 * Создаёт заявку через API от имени seed-юзера.
 * Предполагается, что на странице уже есть сессия соответствующего юзера
 * (используем request context привязанный к context после loginAs).
 * Возвращает id созданной заявки.
 */
export async function createRequestViaApi(
  request: APIRequestContext,
  input: CreateRequestInput,
): Promise<string> {
  const payload = {
    title: input.title,
    body: input.body ?? `<p>${input.title} — body from e2e helper.</p>`,
    type: input.type ?? 'duo',
    fandom_type: input.fandomType ?? 'original',
    content_level: input.contentLevel ?? 'none',
    language: input.language ?? 'ru',
    tags: input.tags ?? ['e2e'],
    is_public: true,
  }
  const res = await request.post('/api/requests', { data: payload })
  if (!res.ok()) {
    throw new Error(`createRequestViaApi failed: ${res.status()} ${await res.text()}`)
  }
  const body = await res.json()
  // Адаптировать под реальную форму ответа API (id / request.id / data.id)
  const id = body.id ?? body.request?.id ?? body.data?.id
  if (!id) throw new Error(`createRequestViaApi: no id in response: ${JSON.stringify(body)}`)
  return id
}

export { SEED_USERS, type SeedUserKey }
```

Проверить реальную форму payload и ответа `/api/requests` — прочитать `src/app/api/requests/route.ts` и поправить helper под факт.

- [ ] **Step 2: Написать тест**

```ts
/**
 * E2E 2.6 — Отклик на заявку → превращение в игру.
 * Luna создаёт заявку → Wolf откликается → появляется игра → оба видят её в /my/games.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'
import { createRequestViaApi } from './fixtures/request'

test.describe('Respond to request', () => {
  test('wolf responds to luna request, game is created', async ({ browser }) => {
    // Контекст Luna — создать заявку
    const lunaCtx = await browser.newContext()
    const lunaPage = await lunaCtx.newPage()
    await loginAs(lunaPage, 'luna')

    const title = `E2E respond ${Date.now()}`
    const requestId = await createRequestViaApi(lunaCtx.request, {
      title,
      type: 'duo',
      fandomType: 'original',
    })

    // Контекст Wolf — откликнуться через UI
    const wolfCtx = await browser.newContext()
    const wolfPage = await wolfCtx.newPage()
    await loginAs(wolfPage, 'wolf')

    await wolfPage.goto(`/requests/${requestId}`)
    await wolfPage.getByRole('button', { name: /откликнуться|respond/i }).click()

    // В отклике нужно написать вступительный пост (см. feedback_product_decisions)
    // Адаптировать под актуальный UI: textarea / TipTap / модалка
    const responseBox = wolfPage.getByRole('textbox').last()
    await responseBox.click()
    await wolfPage.keyboard.type('Привет. Это мой первый пост от E2E теста.')

    await wolfPage.getByRole('button', { name: /отправить|submit|send/i }).click()

    // После отклика Wolf попадает в /games/[id]
    await wolfPage.waitForURL(/\/games\/[0-9a-f-]{36}/, { timeout: 10_000 })

    // Luna заходит в /my/games и видит новую игру
    await lunaPage.goto('/my/games')
    await expect(lunaPage.getByText(title)).toBeVisible()

    await lunaCtx.close()
    await wolfCtx.close()
  })
})
```

- [ ] **Step 3: Запустить**

```bash
npx playwright test respond-to-request.spec.ts
```

- [ ] **Step 4: Коммит**

```bash
git add e2e/respond-to-request.spec.ts e2e/fixtures/request.ts
git commit -m "test(e2e): respond to request creates game (2.6)"
```

---

## Task 8: E2E 2.7 — play-game (SSE)

**Files:**
- Create: `e2e/play-game.spec.ts`

Это самый хрупкий тест: SSE + два контекста. Приоритет — убедиться что при отправке IC-поста одним партнёром, второй получает его через SSE без reload.

- [ ] **Step 1: Прочитать GameDialogClient + SSE hook**

```bash
cat product-mvp/src/components/GameDialogClient.tsx | head -100
cat product-mvp/src/components/hooks/useGameSSE.ts
```

Узнать: как устроен ввод IC-поста (TipTap + кнопка «отправить»), какой роль у поля ввода, как получаются сообщения в UI, какой селектор/текст у только что появившегося сообщения.

- [ ] **Step 2: Написать тест**

```ts
/**
 * E2E 2.7 — Игра и SSE.
 * Luna и Wolf в одной игре. Luna пишет IC-пост — Wolf видит его через SSE без reload.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'
import { createRequestViaApi } from './fixtures/request'

test.describe('Play game — SSE', () => {
  test('wolf receives IC message sent by luna via SSE', async ({ browser }) => {
    // Подготовка: Luna создаёт заявку, Wolf откликается → появляется игра
    const lunaCtx = await browser.newContext()
    const lunaPage = await lunaCtx.newPage()
    await loginAs(lunaPage, 'luna')
    const title = `E2E SSE ${Date.now()}`
    const requestId = await createRequestViaApi(lunaCtx.request, { title, type: 'duo', fandomType: 'original' })

    const wolfCtx = await browser.newContext()
    const wolfPage = await wolfCtx.newPage()
    await loginAs(wolfPage, 'wolf')
    await wolfPage.goto(`/requests/${requestId}`)
    await wolfPage.getByRole('button', { name: /откликнуться|respond/i }).click()
    const opening = wolfPage.getByRole('textbox').last()
    await opening.click()
    await wolfPage.keyboard.type('Начинаю.')
    await wolfPage.getByRole('button', { name: /отправить|submit|send/i }).click()
    await wolfPage.waitForURL(/\/games\/[0-9a-f-]{36}/, { timeout: 10_000 })
    const gameUrl = wolfPage.url()

    // Luna открывает ту же игру
    await lunaPage.goto(gameUrl)

    // Luna пишет IC-пост
    const lunaInput = lunaPage.getByRole('textbox').last()
    await lunaInput.click()
    const lunaText = `luna SSE message ${Date.now()}`
    await lunaPage.keyboard.type(lunaText)
    await lunaPage.getByRole('button', { name: /отправить|submit|send/i }).click()

    // Wolf видит пост Luna БЕЗ reload — это главная проверка SSE
    await expect(wolfPage.getByText(lunaText)).toBeVisible({ timeout: 15_000 })

    await lunaCtx.close()
    await wolfCtx.close()
  })
})
```

- [ ] **Step 3: Запустить (особо следить за flake)**

```bash
npx playwright test play-game.spec.ts --retries 2
```

Если тест flaky — увеличить timeout у `toBeVisible`, убедиться что `wolfPage.waitForURL` дождался полной загрузки `/games/[id]`, проверить что SSE handshake состоялся (`lunaPage.waitForEvent('request', url => url.url().includes('/sse'))`).

- [ ] **Step 4: Коммит**

```bash
git add e2e/play-game.spec.ts
git commit -m "test(e2e): play game — SSE cross-context (2.7)"
```

---

## Task 9: E2E 2.8 — publish-to-library

**Files:**
- Create: `e2e/publish-to-library.spec.ts`

Проблема: для публикации нужно ≥20 IC-постов. Обходить через UI — медленно. Обходить через БД — нарушаем принцип «тест через UI». Компромисс: seed для этого теста — прямой INSERT в messages через psql/pg в beforeAll, после чего UI-флоу короткий (publish-consent → publish-response).

- [ ] **Step 1: Решить стратегию seed**

Варианты:
- (A) Использовать `pg` напрямую из теста: `import { Pool } from 'pg'` — вставить игру + участников + 20 сообщений через SQL, после чего в UI только publish-consent.
- (B) Через batch API: цикл `fetch('/api/games/[id]/messages')` 20 раз.
- (C) Временно понизить порог через env-переменную (отдельный tech debt — не делаем).

Рекомендовано (A). Добавить helper `e2e/fixtures/db.ts` extension.

- [ ] **Step 2: Расширить `e2e/fixtures/db.ts`**

```ts
import { Pool } from 'pg'
import { execSync } from 'node:child_process'

export function resetTestDb() {
  execSync('bash scripts/setup-test-db.sh', { stdio: 'inherit' })
}

export function testDbUrl() {
  return process.env.DATABASE_URL_TEST ?? 'postgresql://postgres:postgres@localhost:5432/apocryph_test'
}

let pool: Pool | null = null
export function testDbPool() {
  if (!pool) pool = new Pool({ connectionString: testDbUrl() })
  return pool
}

/**
 * Inserts N fake IC messages from a given participant into a game.
 * Used to bypass the 20-message publish threshold in E2E.
 */
export async function seedIcMessages(gameId: string, participantId: string, count: number) {
  const p = testDbPool()
  for (let i = 0; i < count; i++) {
    await p.query(
      `INSERT INTO messages (game_id, participant_id, content, type)
       VALUES ($1, $2, $3, 'ic')`,
      [gameId, participantId, `<p>seeded message ${i + 1}</p>`],
    )
  }
}
```

Проверить реальную схему `messages` — возможна колонка `user_id` вместо `participant_id` или обязательные поля, которые тут не задаём. Адаптировать SQL.

- [ ] **Step 3: Написать тест**

```ts
/**
 * E2E 2.8 — publish-consent → publish-response → moderation.
 * Seed: у игры есть ≥20 IC-постов → Luna инициирует publish-consent → Wolf нажимает
 * "Опубликовать как есть" → статус игры переходит в 'moderation'.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'
import { createRequestViaApi } from './fixtures/request'
import { seedIcMessages, testDbPool } from './fixtures/db'

test.describe('Publish to library', () => {
  test('luna initiates publish, wolf approves, game moves to moderation', async ({ browser }) => {
    const lunaCtx = await browser.newContext()
    const lunaPage = await lunaCtx.newPage()
    await loginAs(lunaPage, 'luna')
    const title = `E2E publish ${Date.now()}`
    const reqId = await createRequestViaApi(lunaCtx.request, { title, type: 'duo', fandomType: 'original' })

    const wolfCtx = await browser.newContext()
    const wolfPage = await wolfCtx.newPage()
    await loginAs(wolfPage, 'wolf')
    await wolfPage.goto(`/requests/${reqId}`)
    await wolfPage.getByRole('button', { name: /откликнуться|respond/i }).click()
    await wolfPage.getByRole('textbox').last().fill('Начало.')
    await wolfPage.getByRole('button', { name: /отправить|submit|send/i }).click()
    await wolfPage.waitForURL(/\/games\/[0-9a-f-]{36}/, { timeout: 10_000 })
    const gameId = wolfPage.url().split('/games/')[1].split(/[/?#]/)[0]

    // Seed 20 IC-постов для обоих участников (по 10 каждый)
    const db = testDbPool()
    const { rows } = await db.query(
      `SELECT id, user_id FROM game_participants WHERE game_id = $1 ORDER BY joined_at`,
      [gameId],
    )
    for (const p of rows) {
      await seedIcMessages(gameId, p.id, 10)
    }

    // Luna инициирует publish
    await lunaPage.goto(`/games/${gameId}`)
    await lunaPage.getByRole('button', { name: /публикац|опубликов|publish/i }).first().click()
    // Модалка — "Опубликовать как есть" / "Отредактировать" / "Отменить"
    await lunaPage.getByRole('button', { name: /опубликовать как есть|publish.as.is/i }).click()
    // Должно появиться сообщение «запрос отправлен партнёру»
    await expect(lunaPage.getByText(/отправлен|ожида|waiting/i).first()).toBeVisible()

    // Wolf видит баннер и одобряет
    await wolfPage.goto(`/games/${gameId}`)
    await wolfPage.getByRole('button', { name: /опубликовать как есть|publish.as.is/i }).click()

    // Статус игры → moderation. Проверяем через API или через UI-индикатор статуса
    await expect(wolfPage.getByText(/модерац|moderation/i).first()).toBeVisible({ timeout: 10_000 })

    await lunaCtx.close()
    await wolfCtx.close()
  })
})
```

- [ ] **Step 4: Запустить**

```bash
npx playwright test publish-to-library.spec.ts
```

- [ ] **Step 5: Коммит**

```bash
git add e2e/publish-to-library.spec.ts e2e/fixtures/db.ts
git commit -m "test(e2e): publish to library flow (2.8)"
```

---

## Task 10: E2E 2.9 — moderation

**Files:**
- Create: `e2e/moderation.spec.ts`

- [ ] **Step 1: Написать тест**

Seed-подход: создать игру в статусе `moderation` напрямую в БД (минуя долгий путь через publish-flow, который уже покрыт в 2.8).

```ts
/**
 * E2E 2.9 — Модерация игры.
 * Seed: игра в статусе 'moderation' → admin Luna заходит в /admin →
 * одобряет игру → статус становится 'published'.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'
import { testDbPool } from './fixtures/db'

test.describe('Moderation', () => {
  test('admin approves a game in moderation, it becomes published', async ({ page }) => {
    const db = testDbPool()

    // Seed: берём первую «готовую» игру или создаём её
    // Для простоты — создаём игру от wolf+ember с 20 постами и статусом moderation
    const { rows: [game] } = await db.query(
      `INSERT INTO games (request_id, ooc_enabled, status)
       SELECT id, false, 'moderation' FROM requests WHERE author_id = $1 LIMIT 1
       RETURNING id`,
      ['11111111-1111-1111-1111-111111111111'], // luna
    )
    const gameId = game.id

    // Участники: luna и wolf
    await db.query(
      `INSERT INTO game_participants (game_id, user_id, nickname)
       VALUES ($1, $2, 'Луна'), ($1, $3, 'Волк')
       ON CONFLICT DO NOTHING`,
      [gameId, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'],
    )

    // 20 IC-постов от первого участника
    const { rows: [firstP] } = await db.query(
      `SELECT id FROM game_participants WHERE game_id = $1 ORDER BY joined_at LIMIT 1`,
      [gameId],
    )
    for (let i = 0; i < 20; i++) {
      await db.query(
        `INSERT INTO messages (game_id, participant_id, content, type) VALUES ($1, $2, $3, 'ic')`,
        [gameId, firstP.id, `<p>seeded ${i}</p>`],
      )
    }

    // Luna (admin) открывает админку и одобряет
    await loginAs(page, 'luna')
    await page.goto('/admin')
    await page.getByRole('link', { name: /игры|games/i }).or(page.getByRole('tab', { name: /игры|games/i })).first().click()

    // Найти конкретную игру (по id или по заголовку)
    const row = page.locator('[data-game-id]').filter({ hasText: gameId }).or(
      page.getByText(gameId).locator('xpath=ancestor::*[self::tr or self::li or self::article][1]'),
    ).first()

    await row.getByRole('button', { name: /одобрить|approve/i }).click()

    // Статус сменился на published — проверить через API
    const res = await page.request.get(`/api/public-games/${gameId}`)
    expect(res.ok()).toBeTruthy()
  })

  test('admin rejects a game, it goes back to preparing', async ({ page }) => {
    const db = testDbPool()
    // Аналогично — создать игру в moderation, отклонить, убедиться что status = 'preparing' или 'active'
    // (в зависимости от бизнес-логики moderate reject)
    // Адаптировать под реальный ответ API
    const { rows: [game] } = await db.query(
      `INSERT INTO games (request_id, ooc_enabled, status)
       SELECT id, false, 'moderation' FROM requests WHERE author_id = $1 OFFSET 1 LIMIT 1
       RETURNING id`,
      ['11111111-1111-1111-1111-111111111111'],
    )
    const gameId = game.id

    await loginAs(page, 'luna')
    await page.goto('/admin')
    await page.getByRole('link', { name: /игры|games/i }).or(page.getByRole('tab', { name: /игры|games/i })).first().click()
    const row = page.getByText(gameId).locator('xpath=ancestor::*[self::tr or self::li or self::article][1]').first()
    await row.getByRole('button', { name: /отклон|reject/i }).click()

    // Убедиться что игра больше не в списке «на модерации»
    await expect(row).toBeHidden()
  })
})
```

Адаптировать SQL под реальную схему `games`, `game_participants`, `messages`. Если `game_participants` не принимает `nickname` без `avatar` — подправить.

- [ ] **Step 2: Запустить**

```bash
npx playwright test moderation.spec.ts
```

- [ ] **Step 3: Коммит**

```bash
git add e2e/moderation.spec.ts
git commit -m "test(e2e): moderation approve/reject (2.9)"
```

---

## Task 11: Финальная проверка — все 9 E2E зелёные локально + CI

- [ ] **Step 1: Полный прогон E2E локально**

```bash
cd product-mvp
npm run test:db:reset
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/apocryph_test \
  npm run test:e2e
```

Expected: 9 сюит, все зелёные. Если какая-то flaky — 1 retry допустим, постоянный flake = баг (исследовать).

- [ ] **Step 2: Полный прогон vitest**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: всё зелёное. Никаких регрессий на основном коде.

- [ ] **Step 3: Push и PR**

```bash
git push -u origin feat/tdd-phase-2-e2e
```

Создать PR через `gh pr create` с описанием:
- Что сделано (9 E2E)
- Как запустить
- Известные ограничения (flake-toleranсe, БД-seeding в publish/moderation)

- [ ] **Step 4: Дождаться зелёного CI**

CI на GitHub Actions должен прогнать lint → typecheck → test → build → test:e2e. Если что-то красное — разбираться по логам, фиксить, пушить.

- [ ] **Step 5: Обновить спеку Phase 2**

В `product-mvp/docs/superpowers/specs/2026-04-21-tdd-adoption-design.md` в конце файла добавить секцию:

```markdown
## Phase 2 — Статус

**Завершено:** <дата>
**PR:** <ссылка>
**Что сделано:**
- [x] 9 E2E флоу (auth, reset-password, create-request, feed-filters, profile-settings, respond-to-request, play-game, publish-to-library, moderation)
- [x] globalSetup сбрасывает тестовую БД перед прогоном
- [x] `e2e/fixtures/users.ts` — реестр seed-юзеров
- [x] CI зелёный
```

- [ ] **Step 6: Коммит обновления спеки**

```bash
git add product-mvp/docs/superpowers/specs/2026-04-21-tdd-adoption-design.md
git commit -m "docs(tdd): mark Phase 2 complete"
git push
```

- [ ] **Step 7: Мёрж PR**

После того как CI зелёный и ревью пройдено — squash-мёрж в main. Удалить ветку.

---

## После Phase 2

Следующая — **Phase 3**: активация правила TDD в CLAUDE.md + обновление `.conventions/`. Отдельный plan.

## Замечания для исполнителя

- **Селекторы** в шаблонах теста — предположительные. Обязательно смотреть реальную вёрстку и подстраивать `getByRole`/`getByLabel` regex. Это нормально — план даёт каркас, а не финальные строки.
- **Если какой-то UI в проекте отличается от описанного в плане** (например, reset-password — это stub, а не полный флоу) — упрощаем тест до реального поведения и помечаем в коммит-сообщении. Не выкручиваем руки коду ради теста.
- **Если какое-то API не возвращает id в том виде, в котором здесь предполагается** — читаем реализацию, правим helper, продолжаем.
- **Rate limit** может бить по E2E, если много регистраций подряд. Если столкнулись — добавить в `playwright.config.ts` `webServer.env.RATE_LIMIT_DISABLED=1` (требует поддержки в `src/lib/rate-limit.ts` — если нет, сделать minimal изменение там с флагом ТОЛЬКО для теста).
- **Тесты изолированы** через уникальные email + seed reset. Не полагаться на «луна уже создала заявку в прошлом тесте».
