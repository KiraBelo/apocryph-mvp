# TDD Adoption — Design

**Дата:** 2026-04-21
**Автор:** bkira2225 + Claude
**Статус:** Phase 1 завершена 2026-04-23 (PR #2, squash `9f6446f`). Phase 2-4 впереди.

## Цель

Внедрить Test-Driven Development как стандартный процесс разработки в проект Apocrif. Обеспечить инфраструктуру для тестирования на всех уровнях (unit, integration, E2E), защитить критичные пользовательские флоу регрессионными тестами, установить правила TDD для всех последующих изменений кода.

## Что уже есть

- Vitest 4.1.0, `@vitest/coverage-v8` — настроены
- `vitest.config.ts` с `environment: 'node'` и setup-файлом
- 238 проходящих тестов (backend, API, lib) в папках `src/lib/__tests__/`, `src/app/api/__tests__/`
- Gold standard для backend-теста: `.conventions/gold-standards/test-file.test.ts`

## Что отсутствует

- Инфраструктура для тестирования клиентских компонентов (JSDOM, React Testing Library)
- E2E фреймворк
- Pre-commit hooks
- GitHub Actions CI
- Правила TDD в `CLAUDE.md`
- 0% покрытия клиентских компонентов

## Принятые решения

| Параметр | Значение |
|----------|----------|
| Когда применяется TDD | Новые фичи + баг-фиксы + модификации существующего кода (Boy Scout rule) |
| Освобождены от теста | Косметические правки: CSS, текст (копирайтинг), иконки, вёрстка без логики |
| Типы тестов | Классическая пирамида: много unit → меньше integration → 9 критичных E2E |
| Целевое покрытие | Без процентного порога; тесты везде, где приносят ценность |
| CI-защита | Два уровня: pre-commit (husky + lint-staged) + GitHub Actions на PR |
| Эскейп-хатч | Сначала повысить уровень (unit → integration → E2E); если реально невозможно — `// SKIP-TEST: <причина>` с обоснованием |
| Test-runner | Vitest (уже в проекте; CLAUDE.md явно запрещает Jest) |
| Architecture | Vitest Workspace с двумя project: `server` (node) и `client` (jsdom) |
| E2E | Playwright |
| API-моки в клиентских тестах | MSW (Mock Service Worker) |
| Порядок раскатки | Инфраструктура + 9 E2E флоу → включение правила TDD → органический рост coverage |

## Архитектура

Три уровня тестов, три окружения:

```
┌─────────────────────────────────────────────────────────┐
│  E2E (Playwright)                                       │
│  └─ e2e/*.spec.ts                                       │
│     Реальный Next.js dev-server + реальный Postgres     │
├─────────────────────────────────────────────────────────┤
│  Integration + Unit (Vitest)                            │
│  ├─ project "server" — environment: node                │
│  │  └─ src/lib/__tests__/, src/app/api/__tests__/       │
│  │     БД через vi.mock('@/lib/db')                     │
│  │                                                       │
│  └─ project "client" — environment: jsdom               │
│     └─ src/components/__tests__/                         │
│        React Testing Library + user-event                │
│        API через MSW handlers                            │
└─────────────────────────────────────────────────────────┘
```

### Структура файлов

```
product-mvp/
├── vitest.workspace.ts              (новый: реестр двух project)
├── vitest.config.server.ts          (новый: node env, server tests)
├── vitest.config.client.ts          (новый: jsdom env, client tests)
├── playwright.config.ts             (новый: E2E конфиг)
├── .husky/
│   └── pre-commit                   (новый: запускает lint-staged)
├── .github/workflows/
│   └── ci.yml                       (новый: CI pipeline)
├── src/
│   ├── test/
│   │   ├── setup.ts                 (существует; общий setup)
│   │   ├── setup-client.ts          (новый: jsdom + jest-dom + MockEventSource)
│   │   ├── test-utils.tsx           (новый: render-with-providers)
│   │   └── mocks/
│   │       ├── db.ts                (новый: @/lib/db мок)
│   │       ├── session.ts           (новый: iron-session мок)
│   │       ├── next.ts              (новый: next/navigation, next/headers)
│   │       └── handlers.ts          (новый: MSW handlers для API)
│   ├── components/__tests__/        (новый каталог)
│   ├── lib/__tests__/               (существует, 9 файлов)
│   └── app/api/__tests__/           (существует, 4 файла)
├── e2e/
│   ├── fixtures/
│   │   ├── auth.ts                  (login-as-luna, login-as-wolf helpers)
│   │   └── seed.ts                  (reset/seed БД перед suite)
│   ├── auth.spec.ts                 (Phase 2.1)
│   ├── reset-password.spec.ts       (Phase 2.2)
│   ├── create-request.spec.ts       (Phase 2.3)
│   ├── feed-filters.spec.ts         (Phase 2.4)
│   ├── profile-settings.spec.ts     (Phase 2.5)
│   ├── respond-to-request.spec.ts   (Phase 2.6)
│   ├── play-game.spec.ts            (Phase 2.7; SSE)
│   ├── publish-to-library.spec.ts   (Phase 2.8)
│   └── moderation.spec.ts           (Phase 2.9)
└── .conventions/gold-standards/
    ├── test-file.test.ts            (существует; backend unit)
    ├── component-test.test.tsx      (новый: эталон client)
    ├── integration-test.test.ts     (новый: эталон integration)
    └── e2e-test.spec.ts             (новый: эталон E2E)
```

### Новые зависимости

**devDependencies:**
- `@testing-library/react`
- `@testing-library/user-event`
- `@testing-library/jest-dom`
- `jsdom`
- `@playwright/test`
- `msw`
- `husky`
- `lint-staged`

### Команды npm

```bash
npm test                # все vitest (server + client projects)
npm run test:server     # только server project
npm run test:client     # только client project
npm run test:e2e        # Playwright E2E
npm run test:all        # всё включая E2E (локально перед PR)
npm run test:watch      # vitest в watch-режиме
npm run test:coverage   # покрытие через v8
```

## Поток выполнения

### TDD flow для новой фичи

1. Разработчик открывает `npm run test:watch` в терминале.
2. Пишет тест → красный.
3. Пишет минимум кода → зелёный.
4. Рефакторит → тесты остаются зелёными.
5. `git commit` → pre-commit hook:
   - `lint-staged` запускает `eslint --fix` и `vitest related --run` только на изменённых файлах.
   - Цель: ≤10 секунд.
6. `git push` → GitHub Actions: install → lint → test → build → test:e2e → coverage report.

### Boy Scout rule для существующих клиентских компонентов

При модификации файла с 0% покрытия:
1. Пишем тесты для существующего поведения (рендер, основные взаимодействия).
2. Вносим изменение + тест для изменения.
3. Файл больше не в «списке долга».

### E2E с базой данных

- `globalSetup` Playwright: reset тестовой БД (`apocryph_test`) + применение `schema.sql` + `seed-dev.sql`.
- Каждый `test.describe` получает fixture с транзакцией-обёрткой → автоматический откат.
- В CI: PostgreSQL service container через GitHub Actions.
- Базовый URL: `http://localhost:3000` (Playwright запускает dev-сервер через `webServer` в конфиге).

### Эскейп-хатч

Если тест реально невозможен (SSE reconnect на 30 мин, внешние сервисы без sandbox):

```ts
// SKIP-TEST: SSE reconnect logic requires 30-minute timer;
//           manual verification after SSE changes (see PHASE3-PLAN.md)
function reconnectSSE() { ... }
```

Код-ревью решает принимать комментарий или требовать тест.

## Обработка проблем

### Хрупкие E2E-тесты
- Только авто-waiting API Playwright (`await expect(locator).toBeVisible()`).
- Никаких `page.waitForTimeout()`.
- Конфиг: `retries: 2` в CI, `0` локально. Стабильные падения = баг, не flakiness.

### Изоляция БД между E2E-тестами
- Отдельная БД `apocryph_test`, не `apocryph`.
- Транзакции-обёртки через fixture.
- Пересоздание из schema+seed между `describe` при необходимости.

### Mock drift
- Централизованные моки (`src/test/mocks/`).
- Моки типизированы через `src/types/api.ts` — TS ловит расхождения.
- E2E против настоящей БД — страховка.

### «Локально работает, в CI падает»
- Node version pinned в `package.json/engines.node` и GitHub Actions.
- `TZ=UTC` в vitest setup и CI env.
- Секреты CI (SESSION_SECRET, DATABASE_URL) заданы явно.

### Медленный pre-commit
- Только `vitest related` на связанные файлы.
- E2E никогда в pre-commit.
- Порог: 10 секунд. Если больше — разбивать конфиг.

### Срочные фиксы в прод
- `git commit --no-verify` разрешён только при аварии в прод.
- Обязательный follow-up: регрессионный тест на баг.

### Тесты мешают рефакторингу
- Тесты пишем на **поведение** (input → output, user action → result), не на реализацию.
- Рефакторинг без изменения поведения = тесты не переписываются.

## Стратегия мокирования (Apocrif-specific)

### База данных (`@/lib/db`)
Для unit-тестов:
```ts
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  withTransaction: vi.fn((cb) => cb({ query: vi.fn() })),
}))
```
Для integration-тестов — тестовый Postgres контейнер в CI, mock локально.

### Iron-session
Хелпер `mockAuthedUser(userId, role)` в `src/test/mocks/session.ts`. Используется только в server-тестах. Клиентские тесты работают через API-ответы (MSW).

### Server-Sent Events

**Client unit:** `MockEventSource` в `setup-client.ts`:
```ts
class MockEventSource {
  onmessage: ((e: MessageEvent) => void) | null = null
  addEventListener(type: string, handler: EventListener) { /* ... */ }
  close() { /* ... */ }
  dispatchMessage(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) }) }
}
globalThis.EventSource = MockEventSource as unknown as typeof EventSource
```

**E2E:** два Playwright-контекста (luna и wolf). Один пишет — второй получает через SSE без перезагрузки.

**Server unit:** тест SSE-хендлера через проверку `ReadableStream` и счётчика подписок.

### Rate limit
Уже покрыт backend-тестами. В клиентских тестах MSW handler возвращает 429 → проверяем показ Toast с ключом `errors.tooManyRequests`.

### TipTap
- Unit: не тестируем внутренности редактора. Тестируем обёртку (onChange дёргается, initialContent применяется, сохранение очищает).
- E2E: реальный набор текста через `page.keyboard.type()`.

### Sanitize + stoplist
Уже покрыты backend. Клиентские тесты не используют напрямую.

### Детерминированное время/UUID
```ts
vi.useFakeTimers()
vi.setSystemTime(new Date('2026-04-21T12:00:00Z'))
vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid')
```

### Next.js specifics
- `next/navigation` (`useRouter`, `useSearchParams`): мок в `src/test/mocks/next.ts`.
- `cookies()`, `headers()` из `next/headers`: мок для API-тестов.
- Server Components: не тестируем напрямую (нет стандартной поддержки). Логика выносится в lib-хелперы и тестируется там.

## План раскатки

### Phase 1 — Инфраструктура (1 сессия)

**Цель:** всё установлено и работает, 238 существующих тестов зелёные, CI зелёный, 3 gold standards написаны.

Задачи:
1. Установка devDependencies.
2. Создание `vitest.workspace.ts`, `vitest.config.server.ts`, `vitest.config.client.ts`.
3. Миграция существующих 16 тестовых файлов в server project (без изменения содержимого).
4. Создание `src/test/setup-client.ts`, `test-utils.tsx`, `mocks/`.
5. Настройка Playwright (`playwright.config.ts`, `e2e/fixtures/`, тестовая БД).
6. Husky + lint-staged + `.husky/pre-commit`.
7. `.github/workflows/ci.yml` с Postgres service container.
8. Три gold standard:
   - `component-test.test.tsx` (например, тест `RequestCard` — рендер, теги, клик)
   - `integration-test.test.ts` (например, хук `useGameChat` с MSW)
   - `e2e-test.spec.ts` (минимальный шаблон на главную страницу)

**Выход:** `npm test` зелёный, `npm run test:e2e` зелёный, CI проходит.

### Phase 2 — 9 критичных E2E (4-5 сессий)

Порядок от простого к сложному:

| # | Файл | Сценарий |
|---|------|----------|
| 2.1 | `auth.spec.ts` | Регистрация → логин → выход. Отладка инфраструктуры Playwright. |
| 2.2 | `reset-password.spec.ts` | Запрос reset → ввод нового пароля → login. |
| 2.3 | `create-request.spec.ts` | Открыть `/requests/new` → заполнить форму → валидация → публикация. |
| 2.4 | `feed-filters.spec.ts` | Фильтры по type, fandom, tags → результаты обновляются. |
| 2.5 | `profile-settings.spec.ts` | Смена аватара, ника, пароля. |
| 2.6 | `respond-to-request.spec.ts` | Отклик на заявку → превращение в игру → редирект в `/games/[id]`. |
| 2.7 | `play-game.spec.ts` | Два контекста (luna, wolf), отправка IC-сообщения одним → получение другим через SSE без reload. |
| 2.8 | `publish-to-library.spec.ts` | Флоу publish-consent → publish-response → moderation → published. |
| 2.9 | `moderation.spec.ts` | Админ 

одобряет/отклоняет отправленную на модерацию игру. |

**Выход:** все 9 E2E проходят в CI. Критичные флоу защищены от регрессий.

### Phase 3 — Включение правила TDD (1 сессия)

1. Обновление `CLAUDE.md`:
   - Новая секция «Правила TDD» со всеми принятыми решениями.
   - Ссылки на gold standards.
   - Определение эскейп-хатча с форматом комментария.
2. Обновление `.conventions/`:
   - Правила TDD формализованы.
   - Указание на соответствующие gold standards.
3. Объявление правила: все новые PR обязаны следовать TDD.

**Выход:** правило активно. Все последующие модификации кода требуют тестов по правилам.

### Phase 4 — Органический рост coverage (фон, бессрочно)

- Каждая фича = тесты первым делом.
- Каждое касание существующего файла = Boy Scout.
- Каждый баг = регрессионный тест.

**Ожидание:** через 2-3 месяца активной разработки клиентские компоненты покрыты на 40-60%.

## Суммарная оценка

- Инфраструктура (Phase 1): ~1 сессия (2-3 часа).
- 9 E2E (Phase 2): ~4-5 сессий.
- Правило TDD + конвенции (Phase 3): ~1 сессия.
- **Итого до «TDD включён»: 6-8 сессий.**

## Нефункциональные требования

- Pre-commit hook должен выполняться за ≤10 секунд на типичном коммите.
- Полный CI-прогон (lint + test + build + test:e2e) — ≤15 минут.
- Flaky-rate E2E-тестов в CI — ≤5% (не более 1 retry из 20 запусков).
- Тесты не должны зависеть от порядка запуска.
- Тесты не должны зависеть от часового пояса, локали, системного времени.

## Что вне scope этого дизайна

- Покрытие существующих клиентских компонентов тестами (делается органически через Boy Scout, не отдельным спринтом).
- Visual regression testing (скриншотные тесты) — возможная будущая надстройка, не сейчас.
- Performance testing (нагрузочные тесты) — отдельная задача.
- Mutation testing — не внедряем в этом спринте.
- Переписывание существующих 238 backend-тестов — остаются как есть.

## Открытые вопросы

Нет. Все ключевые решения приняты через вопросы на фазе брейнштрома.

---

## Phase 1 — Статус

**Завершено:** 2026-04-23
**PR:** #2 https://github.com/KiraBelo/apocryph-mvp/pull/2
**Squash-коммит в main:** `9f6446f`
**CI:** зелёный с первого прогона, 1 мин 49 сек

### Что сделано
- Vitest 4.1 workspace (server + client projects)
- React Testing Library + jsdom + MSW + MockEventSource для SSE
- Playwright + fixtures (resetTestDb, loginAs)
- Husky pre-commit + lint-staged (eslint --fix + vitest related --run)
- GitHub Actions CI: lint → typecheck → test → build → e2e, Postgres 16 service
- 3 gold standards: component (Breadcrumbs), integration (TagList + MSW), E2E (Feed)
- Bonus cleanup: 20 pre-existing TS errors + 3 ESLint errors фиксед (иначе CI был красным)

### Метрики до/после
- Tests: 238 → 245 (+7 из gold standards)
- TS errors: 20 → 0
- ESLint errors: 3 → 0 (57 warnings остались, не критично)
- `npm run build`: падал → проходит

### Известный долг (не блокирующий)
- `requireUser()` → `requireMod()` возвращают обычный union type, не discriminated — требуется `user!.` в каждом call site (15 мест). Следует отрефакторить в discriminated union.
- Husky в монорепо: `core.hooksPath=product-mvp/.husky` в локальном git config + `cd product-mvp` в hook. Fragile при fresh clone — prepare script не найдёт `.git` рядом с `package.json`.
- Старый `.conventions/gold-standards/test-file.test.ts` с закомментированными assertion'ами — 2 "теста" без проверок. Либо переписать в реальный, либо убрать из vitest include.

### Следующие фазы
- **Phase 2:** 9 критичных E2E флоу (отдельный plan)
- **Phase 3:** активация правила TDD в CLAUDE.md + конвенции
- **Phase 4:** органический рост coverage через Boy Scout (бессрочно)

---

## Phase 2 — Статус

**Завершено:** 2026-04-24 (PR в работе)
**Plan:** [`docs/superpowers/plans/2026-04-24-tdd-adoption-phase-2.md`](../plans/2026-04-24-tdd-adoption-phase-2.md)

### Что сделано (9 E2E файлов + инфра)

| Файл | Сценарии |
|---|---|
| `e2e/auth.spec.ts` | Регистрация → logout → логин; неверный пароль; короткий пароль (<6) |
| `e2e/reset-password.spec.ts` | forgot-password 501-stub UI; полный reset через прямой токен в БД; невалидный токен |
| `e2e/create-request.spec.ts` | Аноним → /auth/login; пустая форма → role=alert; «Сохранить черновик» → /my/requests?tab=draft; POST API → /my/requests?tab=active |
| `e2e/feed-filters.spec.ts` | Текстовый поиск; type=multiplayer фильтр; очистка поиска |
| `e2e/profile-settings.spec.ts` | SettingsPanel (адаптация: нет страницы /settings, только панель); тема `data-theme`; язык ru→en; email-toggle для авторизованных |
| `e2e/respond-to-request.spec.ts` | Отклик → /games/[id], игра в /my/games автора; самооотклик скрыт |
| `e2e/play-game.spec.ts` | SSE round trip: author POST → responder видит без reload; outsider GET messages → 403 |
| `e2e/publish-to-library.spec.ts` | tooFewMessages если <20; publish_as_is → moderation; self-approve → 403; edit_first → preparing |
| `e2e/moderation.spec.ts` | admin approve → published + видна в /api/public-games; reject → active; non-admin → 401/403 |

### Инфра (общая для Phase 2+)

- `e2e/global-setup.ts` — сбрасывает `apocryph_test` через `scripts/setup-test-db.sh` перед всем suite (с safety-guard на имя БД)
- `e2e/fixtures/users.ts` — реестр seed-юзеров (email/password/role) — luna=admin, остальные=user
- `e2e/fixtures/auth.ts` — `loginAs(page, key)` через UI на /auth/login (refactored from inline)
- `e2e/fixtures/register.ts` — `registerFreshUser(ctx)` через POST /api/auth/register, кладёт session cookie в context
- `e2e/fixtures/db.ts` — `pg` Pool + helpers: `seedIcMessages`, `listGameParticipants`, `getGameStatus`, `insertResetToken`, `findUserIdByEmail`

### Принятые отклонения от исходного плана

- **2.5 (profile-settings):** в проекте нет страницы /settings со сменой пароля/аватара/ника. Покрываем существующий `SettingsPanel` (тема/язык/email-уведомления) — это максимум profile-функционала, который реально есть.
- **2.2 (reset-password):** `/api/auth/forgot-password` — 501 stub. Тестируем (а) UI обработку ошибки + (б) полный reset через прямой INSERT токена в `password_reset_tokens` от свежего юзера, чтобы не ломать seed-пароли.
- **2.3 (create-request):** UI создания через TipTap + FilterSelect + TagAutocomplete слишком хрупко. Happy-path делаем через POST /api/requests; UI покрываем драфт-кнопкой + валидацией пустой формы.
- **2.7 (play-game):** автор шлёт IC-пост через API, а не печатает в TipTap — регрессионная цель здесь это SSE round-trip, не редактор.

### Известный долг

- E2E запускаются только в CI (Postgres + Playwright + браузеры). Локально на Windows без Postgres большинство тестов не пройдут — это нормально.
- Подавляющее большинство сценариев — happy-path. Sad-path и edge cases добавляются органически по мере фиксов (Phase 4).
