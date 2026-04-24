# TDD Rules — Apocrif

**Status:** активно с 2026-04-24 (Phase 3 of TDD adoption, PR TBD).
**Design:** [`docs/superpowers/specs/2026-04-21-tdd-adoption-design.md`](../docs/superpowers/specs/2026-04-21-tdd-adoption-design.md).

## Когда тест обязателен

Любой PR, который меняет **поведение**, должен содержать тест, покрывающий это поведение. Это относится ко всем трём случаям:

1. **Новая фича** — тест описывает ожидаемое поведение ДО реализации (TDD в классическом смысле: red → green → refactor).
2. **Баг-фикс** — regression test, который падал бы на баговой версии и проходит после фикса.
3. **Модификация существующего кода** — Boy Scout rule: если файл не имел тестов, добавляем тест для изменения + тест для уже работающего основного поведения (чтобы файл вышел из «списка долга»).

## Когда тест НЕ обязателен

Косметические правки без изменения поведения:

- CSS-only изменения (цвета, отступы, шрифты), включая в dedicated CSS/Tailwind файлах.
- Копирайтинг (правки текстовых строк в `src/i18n/*`, replace текстов без смены логики).
- Иконки, SVG, статичные ассеты.
- Чисто вёрсточные правки (перестановка `<div>`, смена классов, переименование CSS-переменных).
- Комментарии и документация.
- Переименование символов без изменения API (refactor-only).

«Без изменения поведения» = тесты, существовавшие до правки, продолжают проходить без изменений.

## Пирамида тестов

| Уровень | Инструмент | Где живут | Что покрывают |
|---|---|---|---|
| Unit | Vitest (`server` project, `node` env) | `src/lib/__tests__/**` | Чистые функции, хелперы (sanitize, rate-limit, auth, game-utils) |
| Integration (backend) | Vitest (`server` project) | `src/app/api/__tests__/**` | API route handlers с моками `@/lib/db` и `@/lib/session` |
| Component | Vitest (`client` project, `jsdom` env) | `src/components/__tests__/**` | React-компоненты через RTL + renderWithProviders |
| Integration (client) | Vitest (`client` project) + MSW | `src/components/__tests__/**` | Компонент + MSW для мокирования `fetch` |
| E2E | Playwright | `e2e/*.spec.ts` | Сквозные пользовательские флоу против dev-сервера и тестовой БД |

**Правило выбора уровня:** самый низкий, на котором можно выразить проверяемое поведение. Unit быстрее E2E на два порядка — начинай с unit, поднимайся только когда функция действительно зависит от I/O, SSE, браузерного окружения или межстраничной навигации.

## Gold standards (шаблоны)

Скопируй соответствующий файл-шаблон как стартовую точку. Шаблоны живут в `.conventions/gold-standards/` и проверяются на актуальность в CI (компилируются + проходят).

- Backend unit/integration: [`test-file.test.ts`](gold-standards/test-file.test.ts)
- Client component: [`component-test.test.tsx`](gold-standards/component-test.test.tsx)
- Client integration с MSW: [`integration-test.test.tsx`](gold-standards/integration-test.test.tsx)
- E2E: [`e2e-test.spec.ts`](gold-standards/e2e-test.spec.ts)

## Команды

```bash
npm test              # все vitest (server + client)
npm run test:server   # только server project
npm run test:client   # только client project
npm run test:watch    # vitest в watch-режиме (основной режим TDD)
npm run test:coverage # покрытие v8 — для одноразовой проверки, не цель
npm run test:e2e      # Playwright (требует DATABASE_URL_TEST + запущенный Postgres)
npm run test:db:reset # пересоздать apocryph_test из schema.sql + seed-dev.sql
```

## Процесс

1. Открываем `npm run test:watch` в терминале.
2. **Пишем тест сначала** → красный.
3. Пишем минимум кода → зелёный.
4. Рефакторим → тесты остаются зелёными.
5. `git commit`:
   - Pre-commit hook (husky) запускает `eslint --fix` + `vitest related --run` на staged-файлах.
   - Должен укладываться в 10 секунд.
6. `git push` → GitHub Actions прогоняет lint → typecheck → test → build → e2e.

## Что проверять в тесте

- **Поведение, а не реализацию.** Тест на input → output / user-action → UI-result. Не на внутренности хука или приватные функции.
- **Граничные случаи.** Пустой ввод, максимум, minus edge case, unauthorized, not-found, concurrent access (где это реально вызывает поведение).
- **Ошибочные пути.** Не только happy-path. Каждая ветка `if (error)` в коде должна иметь соответствующий сценарий.
- **Цель assertion'а — один факт.** `expect(x).toBe(y)` говорит что-то одно. Если в тесте 5 не связанных assertion'ов — это 5 тестов, а не один.

## Эскейп-хатч: `// SKIP-TEST:`

Перед тем как написать `SKIP-TEST`, попробуй **поднять уровень**: если unit невозможен — integration, если integration невозможен — E2E. 90% «невозможно протестировать» становятся возможны на более высоком уровне.

Если тест реально невозможен (SSE reconnect на 30 минут, внешний сервис без sandbox, нативный OS API, таймер на reboot), помечай код явным комментарием:

```ts
// SKIP-TEST: SSE reconnect logic requires 30-minute real timer;
//            manual verification after SSE changes (см. PHASE3-PLAN.md).
function reconnectSSE() { ... }
```

**Формат обязателен:**
- Начинается с `// SKIP-TEST:` (код-ревью грепает эту строку).
- Далее — одна-две строки объяснения: **почему** уровень выше тоже не работает.
- Опционально — ссылка на документ с планом ручной проверки.

Код-ревью может согласиться или потребовать теста. Пустой `SKIP-TEST` без причины — отказ.

## `--no-verify` при срочных фиксах

`git commit --no-verify` разрешён **только** в авариях на проде. В том же или следующем коммите:

1. Regression test на исправленный баг — **обязателен**.
2. В commit-message — ссылка на issue/инцидент.

## Принципы code review

Review блокирует PR если:

- Поведение изменилось, теста нет, `SKIP-TEST` отсутствует или без обоснования.
- Тест написан на реализацию, а не на поведение (ломается при первом рефакторинге без смены логики).
- Тест не падает на предшествующей версии (regression test должен падать до фикса).
- Уровень теста не оптимален: например, E2E там, где хватило бы unit с правильным моком.

## Разрешённые паттерны моков

Централизованы в [`src/test/mocks/`](../src/test/mocks/) и [`src/test/setup-client.ts`](../src/test/setup-client.ts):

- `@/lib/db` — моки `query`, `queryOne`, `withTransaction`.
- `@/lib/session` — моки `requireUser`, `requireMod`, `getUser`, `getSession`.
- `next/navigation` — моки `useRouter`, `usePathname`, `useSearchParams`.
- MSW через `server` из `@/test/mocks/server` — для клиентских `fetch`-интеграций.
- `MockEventSource` — для SSE в jsdom.

Детерминированное время:

```ts
vi.useFakeTimers()
vi.setSystemTime(new Date('2026-04-21T12:00:00Z'))
```

## Что ломает тесты и как этого избежать

- **`any`, `as unknown as`** ради прохождения компиляции — запрещено (CLAUDE.md). Подгоняй тип, не обходи его.
- **Порядок `vi.mock()` и `import`** — `vi.mock` поднимается в начало файла хоистингом, но держи его физически выше import'ов, чтобы не было путаницы при чтении.
- **`vi.clearAllMocks()` в `beforeEach`** — обязательно, иначе состояние протекает между тестами и порядок запуска начинает иметь значение.
- **RTL `cleanup()`** — выполняется автоматически из `setup-client.ts`; никогда не импортируй и не вызывай руками.
- **`await page.waitForTimeout(...)` в E2E** — запрещено. Только auto-waiting через `expect(locator).toBeVisible()` / `toHaveText()`.

## Ссылки

- Design: [`docs/superpowers/specs/2026-04-21-tdd-adoption-design.md`](../docs/superpowers/specs/2026-04-21-tdd-adoption-design.md)
- Phase 1 plan (инфра): [`docs/superpowers/plans/2026-04-21-tdd-adoption-phase-1.md`](../docs/superpowers/plans/2026-04-21-tdd-adoption-phase-1.md)
- Phase 2 plan (9 E2E): [`docs/superpowers/plans/2026-04-24-tdd-adoption-phase-2.md`](../docs/superpowers/plans/2026-04-24-tdd-adoption-phase-2.md)
- Import conventions: [`checks/imports.md`](checks/imports.md)
- Naming conventions: [`checks/naming.md`](checks/naming.md)
- Anti-patterns: [`anti-patterns/avoid-alert.md`](anti-patterns/avoid-alert.md), [`anti-patterns/avoid-string-types.md`](anti-patterns/avoid-string-types.md)
