# Апокриф — анонимная платформа текстовых ролевых игр

## Стек

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + CSS-переменные + `@theme` токены (Tailwind-классы, inline style только для динамических значений)
- **Database:** PostgreSQL (через `pg` Pool, без ORM)
- **Auth:** iron-session (cookie `apocryph_session`, 30 дней)
- **Rich editor:** TipTap (посты в игровом диалоге, текст заявок)
- **Sanitization:** sanitize-html

## Команды

```bash
cd product-mvp
npm run dev      # запуск dev-сервера (localhost:3000)
npm run build    # production build
npm run lint     # eslint
npx vitest run   # запуск тестов (проект использует vitest, НЕ jest)
npx vitest run src/lib/__tests__/game-utils.test.ts  # конкретный файл
```

База данных: `psql -U postgres -d apocryph < schema.sql`
Seed data (DEV ONLY): `psql -U postgres -d apocryph < seed-dev.sql`

## Структура проекта

```
product-mvp/
  schema.sql              # схема БД (без seed data)
  seed-dev.sql            # seed data для разработки (DEV ONLY, 4 юзера + 16 заявок)
  .env.local              # DATABASE_URL, SESSION_SECRET
  src/
    app/
      page.tsx            # главная — лента заявок
      layout.tsx          # корневой layout (Nav, SettingsPanel, SettingsProvider)
      globals.css         # дизайн-токены, темы (light/dark), TipTap стили
      auth/               # /auth/login, /auth/register
      requests/           # /requests/new, /requests/[id], /requests/[id]/edit
      games/[id]/         # /games/[id] — игровой диалог
      my/                 # /my/requests, /my/games
      bookmarks/          # /bookmarks
      invite/[token]/     # принятие инвайт-ссылки
      feed/               # /feed — лента заявок (альтернативный вход)
      library/            # /library, /library/[id] — публичная библиотека игр
      admin/              # /admin — панель администратора
        reports/          # модерация жалоб
        stop-list/        # стоп-лист
        users/            # управление пользователями
      api/
        auth/             # register, login, logout
        requests/         # CRUD заявок, /[id]/respond
        games/            # CRUD игр, messages, notes, leave, report, dice, SSE, unread-count
                          # + publish-consent (POST/DELETE), publish-response (POST),
                          # + submit-to-moderation (POST)
        bookmarks/        # добавление/удаление закладок
        blacklist/        # чёрный список тегов пользователя
        invites/          # создание/принятие инвайтов
        tags/             # GET автокомплит, POST создание тегов
        public-games/     # публичный API библиотеки + /[id]/likes (GET/POST toggle), /[id]/comments
        admin/            # API админки (games, reports, stop-list, users, violations)
                          # + games/[id]/moderate (POST approve/reject), comments/[id] (POST approve / DELETE)
        __tests__/        # тесты API (admin-users, auth, messages, requests)
    components/
      Nav.tsx             # навигация
      Landing.tsx         # лендинг (+ Landing.module.css)
      FeedClient.tsx      # лента заявок с фильтрами и тег-чипами
      RequestCard.tsx     # карточка заявки
      RequestForm.tsx     # форма создания/редактирования заявки
      RequestFormWrapper.tsx  # обёртка формы заявки
      RequestDetailClient.tsx  # просмотр заявки
      MyRequestsClient.tsx     # мои заявки
      MyRequestsHeader.tsx     # заголовок «мои заявки»
      GameDialogClient.tsx     # игровой диалог (IC/OOC/Dice, SSE)
      MyGamesClient.tsx        # мои игры
      BookmarksClient.tsx      # закладки
      LibraryClient.tsx        # лента библиотеки
      PublicGameViewer.tsx     # просмотр опубликованной игры
      RichEditor.tsx      # TipTap-редактор для постов
      OocEditor.tsx       # редактор OOC-сообщений
      TagAutocomplete.tsx # автокомплит тегов с fuzzy-search
      InviteClient.tsx    # страница принятия инвайта
      InvalidInviteClient.tsx  # невалидный инвайт
      BanBanner.tsx       # баннер бана
      AdminReports.tsx    # админка: жалобы
      AdminStopList.tsx   # админка: стоп-лист
      AdminUsers.tsx      # админка: пользователи
      SettingsContext.tsx  # контекст настроек (тема, шрифт, пресеты тегов)
      SettingsPanel.tsx   # панель настроек
      ThemeProvider.tsx    # провайдер темы
      NotFoundClient.tsx  # страница 404
      game/               # субкомпоненты игрового диалога
        MessageBubble.tsx, MessageEditor.tsx, MessageFeed.tsx
        SearchPanel.tsx, SettingsModal.tsx, TopBar.tsx
        StatusBanners.tsx, StatusChip.tsx, NotesTab.tsx, MsgContent.tsx
        PrepareTab.tsx, PublishConsentModal.tsx, ModerationSentModal.tsx
        EpilogueModal.tsx, ExportModal.tsx, exportUtils.ts
        Modal.tsx, types.ts, utils.ts
      ToastProvider.tsx    # Toast-уведомления (useToast хук)
      ConfirmDialog.tsx    # стилизованный диалог подтверждения (замена window.confirm)
      Breadcrumbs.tsx      # хлебные крошки
      hooks/              # хуки игрового диалога
        useGameChat.ts, useGameSSE.ts, useGameSearch.ts
        useGameNotes.ts, useDiceRoller.ts, usePublishFlow.ts
    lib/
      db.ts               # Pool + query/queryOne/withTransaction хелперы
      session.ts          # getSession/getUser (iron-session)
      auth.ts             # хелперы авторизации
      sanitize.ts         # настройки sanitize-html
      fonts.ts            # конфиг шрифтов
      sse.ts              # Server-Sent Events хелперы
      rate-limit.ts       # антиспам (rate limiting)
      stoplist.ts         # стоп-лист слов
      game-utils.ts       # утилиты игр
      __tests__/          # тесты lib (auth, rate-limit, sanitize, stoplist, game-utils)
    types/
      api.ts              # централизованные типы (GameStatus, MessageType, UserRole, BannerPref и др.)
```

## База данных

Таблицы: `users`, `requests`, `games`, `game_participants`, `messages`, `bookmarks`, `invites`, `user_tag_blacklist`, `game_notes`, `reports`, `tags`, `tag_i18n`, `tag_aliases`, `request_tags`, `game_publish_consent`, `game_likes`, `game_comments`, `notifications`

- UUID первичные ключи (pgcrypto)
- Теги заявок: dual-write — `request_tags` (junction, нормализованные) + `requests.tags TEXT[]` (кэш для отображения)
- Структурированные теги: 9 категорий (fandom, genre, trope, setting, character_type, pairing, mood, format, other), i18n (ru/en/es/pt), алиасы, fuzzy-search через pg_trgm
- Auto-approve: тег одобряется после 3+ использований
- Теги: лимит 50 символов, создание через Enter → выбор категории → (пейринг/персонаж) привязка к фандому через `parent_tag_id`
- Сообщения имеют тип: `ic` (in-character), `ooc` (out-of-character), `dice`
- OOC выключен по умолчанию (`games.ooc_enabled DEFAULT false`)
- Участники игры: nickname + avatar per game, `left_at`/`leave_reason` при выходе
- Seed-юзеры: luna/wolf/ember/starfall@apocryph.test, пароль: `apocryph123`

## Дизайн-система

- Темы (4): light (бумага), sepia (сепия), ink (чернила), nocturne (полночь). Полный список — `[data-theme=...]` блоки в `globals.css` + валидация в `ThemeProvider.tsx` и FOUC-bootstrap в `layout.tsx`.
- CSS-переменные: `--bg`, `--bg-2`, `--bg-3`, `--text`, `--text-2`, `--accent`, `--accent-2`, `--accent-dim`, `--border`
- Light accent: `#8b1a1a` (тёмно-красный). Dark accent: `#c4b5f4` (лавандовый)
- Шрифты: `--serif` (Cormorant Garamond), `--serif-body` / `--site-font` (Georgia), `--mono` (Courier Prime)

### Tailwind-токены (`@theme` в globals.css)

CSS-переменные маппятся на Tailwind через `@theme`:
- Цвета: `bg-surface`, `bg-surface-2`, `bg-surface-3`, `text-ink`, `text-ink-2`, `text-accent`, `border-edge`, `bg-accent-dim`
- Шрифты: `font-heading`, `font-body`, `font-mono`
- Inline `style={}` — только для значений, зависящих от JS-состояния (условные border, background-image, transform и т.п.)

### CSS-классы компонентов (globals.css)

Повторяющиеся паттерны вынесены в CSS-классы:
- `.section-label` — метки секций (mono, uppercase, letter-spacing)
- `.page-title` — заголовки страниц
- `.badge`, `.badge-type`, `.badge-fandom`, `.badge-content`, `.badge-tag` — бейджи
- `.btn-primary`, `.btn-ghost` — кнопки
- `.input-base`, `.select-base` — поля ввода
- `.card` — карточка заявки/игры
- `.link-accent`, `.meta-text` — текстовые стили
- `.overlay`, `.modal` — модальные элементы
- `.tag-chip`, `.blacklist-chip`, `.preset-chip`, `.filter-input` — элементы фильтров
- `.tag-menu-item`, `.icon-action-btn` — элементы меню и действий

## Соглашения

- Язык интерфейса: русский (i18n запланирован: RU, EN, ES, PT)
- Язык кода: английский (переменные, функции, комментарии)
- Компоненты: функциональные, React hooks
- API routes: Next.js App Router route handlers (route.ts)
- SQL-запросы: прямые через `query()` / `queryOne()` из `lib/db.ts`, параметризированные ($1, $2...)
- Без ORM — сырой SQL
- Авторизация в API: `getUser()` из `lib/session.ts`, возвращает `null` если не авторизован

## Принципы продукта

- Анонимность по умолчанию — никакой информации о пользователе не раскрывается
- Нет индикатора онлайн, нет времени сообщений, нет индикатора набора текста
- Никнейм существует только внутри конкретной игры
- Асинхронность — игры могут длиться сколько угодно
- Безопасный выход — обязательная причина при выходе из игры

## Игровой диалог (GameDialogClient)

- 3 раскладки постов: **dialog** (мой справа, чужой слева), **feed** (аватары чередуются по сторонам), **book** (без аватарок, только имя + текст)
- Вкладки: IC (история), OOC (оффтоп, выключен по умолчанию), Notes (заметки)
- Поиск по IC/OOC/Notes: результаты в панели, клик → скролл к сообщению + подсветка, панель не закрывается
- Настройки: 4 группы — Персонаж (никнейм, аватар), Оформление (раскладка, баннер), Вкладки (OOC, заметки), Управление (публикация — через StatusChip в TopBar)
- Click-outside в дропдаунах: использовать `skipCloseRef` (ref-флаг), а не `e.stopPropagation()` — React synthetic events не блокируют native document listeners

## Жизненный цикл игр

- **Статусы:** `active` → `preparing` → `moderation` → `published`
- **Инициация публикации:** Любой участник (≥20 IC-постов) отправляет запрос через `POST /api/games/[id]/publish-consent`. Партнёр получает баннер и выбирает через `POST /api/games/[id]/publish-response { choice }`:
  - `publish_as_is` → сразу `status = 'moderation'`
  - `edit_first` → `status = 'preparing'`
  - `decline` → инициатор сохраняет consent, игра остаётся `active`
- **`preparing`:** IC заморожен (нельзя писать новые посты), OOC работает. Участники редактируют посты в PrepareTab. Кнопка «Отправить на публикацию» → `POST .../submit-to-moderation` → `status = 'moderation'`.
- **`moderation`:** Всё заморожено. Администратор одобряет/отклоняет через `POST /api/admin/games/[id]/moderate { action }`.
- **`published`:** Игра в Библиотеке, read-only. Лайки (`game_likes`) и комментарии с премодерацией (`game_comments`).
- **Отзыв:** `DELETE /api/games/[id]/publish-consent` — `status = 'active'`, consent обоих сбрасывается. Из `published` — лайки удаляются.
- **IC блокируется** если `status !== 'active'` (не только на `finished`).
- **Статус `finished` удалён.** `finish_consent` удалён.

### ⚠️ Критичная ловушка — game_publish_consent

Таблица `game_publish_consent` имеет составной PK `(game_id, participant_id)` — **колонки `id` нет**. Запросы `SELECT c.id` или `COUNT(c.id)` сломаются с ошибкой «column c.id does not exist». Использовать `SELECT 1` и `COUNT(c.participant_id)`.

## Библиотека

- `/library` — публичный каталог опубликованных игр, доступен без авторизации
- `/library/[id]` — read-only просмотр IC-сообщений (3 раскладки), без OOC/notes/user_id
- API: `GET /api/public-games` (лента с фильтрами), `GET /api/public-games/[id]` (одна игра)
- Фильтры: type, fandom_type, pairing, content_level, tags, текстовый поиск, blacklist

## Админка

- `/admin` — панель администратора (reports, stop-list, users)
- API: `/api/admin/games`, `/api/admin/reports`, `/api/admin/stop-list`, `/api/admin/users`, `/api/admin/violations`

## Антиспам заявок

- Rate limit: 5 заявок/день
- Кулдаун: 2 минуты между заявками
- Дубликаты: pg_trgm `similarity() > 0.7` по title и body за 24 часа

## Деплой

- Сервер: 31.192.111.43, Ubuntu 22.04, nginx (80→3000), systemd `apocryph.service`
- ExecStart: `/usr/bin/node /opt/apocryph/node_modules/next/dist/bin/next start -p 3000`
- Деплой: `tar -czf` → `scp` → `rsync --exclude=node_modules --exclude=.next` → `npm install` (если нужно) → `rm -rf .next && npx next build` → `systemctl restart apocryph`
- `.env.local` бэкапится перед rsync и восстанавливается после

## Правила качества кода (обязательны при разработке)

Полный план: `../../BETA-PLAN.md` | UX-план: `../../ux-beta.md`

### Тестирование (TDD)

**Правило:** Поведение без теста — не PR. Полный rulebook: [`product-mvp/.conventions/tdd-rules.md`](product-mvp/.conventions/tdd-rules.md).

- **Обязателен тест:** новая фича, баг-фикс (regression test), любое изменение поведения существующего кода. Код-ревью блокирует PR без теста на изменённое поведение.
- **НЕ обязателен тест:** косметика — CSS, копирайтинг через `src/i18n`, иконки, вёрсточный рефактор, чистое переименование без смены API. Критерий: существующие тесты проходят без правок.
- **Пирамида уровней:** unit (vitest `server`, node env) → integration с моками `@/lib/db` → component (vitest `client`, jsdom + RTL) → client integration с MSW → E2E (Playwright). Начинай с самого низкого уровня, на котором выражается поведение.
- **Test-runner:** `vitest` (Jest запрещён). E2E — `@playwright/test`.
- **Режим работы:** `npm run test:watch` открыт в отдельном терминале. Красный → зелёный → рефактор → коммит.
- **Gold standards:** в [`product-mvp/.conventions/gold-standards/`](product-mvp/.conventions/gold-standards/) — шаблоны для backend unit, client component, integration с MSW, E2E. Копируй их как стартовую точку.
- **Тесты на поведение, не реализацию:** `expect(result).toBe(expected)` / `expect(user.sees(X))`, не `expect(internalState)`. Рефакторинг без смены поведения не должен ломать тесты.
- **Моки централизованы:** `product-mvp/src/test/mocks/` (`db`, `session`, `next`). `vi.clearAllMocks()` в `beforeEach`. Клиентские `fetch` — через MSW `server` из `@/test/mocks/server`.
- **E2E-правила:** никаких `page.waitForTimeout()` — только auto-waiting (`expect(locator).toBeVisible()`). Семантические локаторы (`getByRole`, `getByLabel`). Для password — `locator('input[type="password"]')` (`getByLabel` матчит aria-label toggle-кнопки).
- **E2E seed-юзеры:** `loginAs(page, 'luna' | 'wolf' | 'ember' | 'starfall')` из `e2e/fixtures/auth.ts` — Luna это admin. Для multi-user флоу — `registerFreshUser(ctx)` из `e2e/fixtures/register.ts` (минует rate-limit благодаря `APOCRIPH_DISABLE_RATE_LIMIT=1` в Playwright env).
- **Эскейп-хатч `// SKIP-TEST:`** — только когда ни один уровень пирамиды не работает (внешний API без sandbox, 30-минутный real timer, нативный OS API). Формат: `// SKIP-TEST: <одна-две строки почему>`. Без обоснования ревью не примет.
- **`--no-verify`** — только в авариях на проде, с regression-тестом на баг в том же или следующем коммите.
- **Две линии защиты в CI:** pre-commit (husky + lint-staged → eslint + `vitest related --run`, ≤10с) + GitHub Actions (lint → typecheck → test → build → e2e против Postgres 16 service, ≤15 мин).

### Безопасность API
- **Self-action:** всегда проверять `author_id !== user.id` — автор не может откликаться на свою заявку, принимать свой инвайт, одобрять свою публикацию
- **IDOR:** каждый эндпоинт игры — проверка `game_participants` на участие текущего пользователя. Нет участия → 403
- **Left participants:** вышедший из игры (`left_at IS NOT NULL`) не может выполнять действия (report, dice, messages, read)
- **Game status guard:** перед действием проверять `game.status` — dice/messages/notes только в `active`, редактирование постов только в `preparing`
- **Banned check:** в админских эндпоинтах проверять `banned_at IS NULL` помимо роли — забаненный модератор не должен иметь доступ
- **Session lifecycle:** после `session.destroy()` — обязательно `await session.save()`. После смены пароля — инвалидировать все активные сессии
- **Rate limit:** на КАЖДЫЙ write-эндпоинт (не только auth и requests — также comments, reports, notes, dice)
- **Sanitize everywhere:** санитизировать ВСЕ пользовательские данные в ответах, включая никнеймы в JSON (не только HTML-контент)
- **Stub endpoints:** если фича не реализована (например, отправка email), эндпоинт должен возвращать 501, а не молча создавать записи в БД
- **X-Forwarded-For:** не доверять напрямую — использовать IP только от доверенного reverse proxy (nginx `real_ip_header`)
- **SSE cleanup:** при выходе из игры (`leave`) закрывать SSE-соединение для этого пользователя
- **Инвайты:** устанавливать `expires_at` — бессрочные инвайты опасны

### Функциональные правила
- **Проверка инициатора:** пользователь, инициировавший действие (публикацию, жалобу), не может сам его одобрить/подтвердить — нужен другой участник
- **DELETE несуществующего** → 404, не 200. Идемпотентность ≠ молчаливый успех
- **Тесты актуальны:** если статус/поле удалены из схемы БД — удалить из тестов. Не оставлять тесты на `finished` если статус удалён
- **Двойной cleanup:** при отключении SSE/WebSocket использовать флаг `cleaned` — `trackDisconnect` должен вызываться ровно один раз
- **Числовые параметры:** `parseInt` пропускает дробные (`"2.9"` → 2). Валидировать что число целое: `Number.isInteger(Number(value))`

### Архитектура
- **UI-компонент только рендерит.** Fetch-вызовы, мутации, оптимистичные обновления — в кастомных хуках (`src/components/hooks/`)
- **API route handler — тонкий:** парсинг запроса → логика → ответ. Не разращивать SQL-сборку внутри handler
- **Общие SQL-паттерны** (COUNT + pagination, нормализация тегов) — через хелперы из `lib/`, не копипастить
- **Общие проверки авторизации:** вынести в хелперы (`requireMod()`, `requireParticipant(gameId, userId)`) — не дублировать проверку роли/участия в каждом handler
- **Новый API-эндпоинт** — типизировать запрос и ответ в `src/types/api.ts`
- **Мёртвый код:** не оставлять неиспользуемые таблицы/колонки в схеме БД и устаревшие поля в типах. Удалять сразу

### TypeScript
- **Запрещено:** `any`, `as any`, `@ts-ignore`
- **Запрещено:** `as unknown as` для обхода типов — если тип не совпадает, исправить тип, а не кастить
- `eslint-disable` — только с комментарием-объяснением
- DB-запросы с дженериком: `query<MyType>(sql, params)`
- **Union types для известных наборов:** `type: 'ic' | 'ooc' | 'dice'`, не `string`. `banner_pref: 'own' | 'partner' | 'none'`, не `string`
- **Константы — в одном файле.** Не дублировать одну и ту же константу в нескольких местах (например, `MIN_IC_POSTS`)

### Обработка ошибок
- Пустой `.catch(() => {})` — только для fire-and-forget + обязательный комментарий `// fire-and-forget: [причина]`
- API route: всегда `try/catch` → `console.error('[API path] METHOD:', error)` → `{ error: 'errorKey' }`
- **`req.json()` — всегда в try/catch:** невалидный JSON должен возвращать 400, а не 500
- Не глотать ошибки молча в операциях, важных для пользователя

### React-паттерны
- useEffect: полный массив зависимостей. Если нужно исключить — useRef-паттерн (как в useGameSSE), НЕ eslint-disable
- setInterval/setTimeout — всегда cleanup в return useEffect
- EventSource/WebSocket — всегда `.onerror` обработчик + cleanup. При ошибке SSE — показывать пользователю, не глотать молча
- Стабилизация колбэков через useRef (не useCallback с пустыми deps)
- **Подписки (addEventListener):** регистрировать в `useEffect`, не в `useState`. Всегда `removeEventListener` в cleanup — иначе утечка
- **Большие компоненты (300+ строк):** выносить логику в кастомные хуки (например, `usePublishFlow` из `GameDialogClient`). Inline-обработчики с логикой → отдельные функции
- **addEventListener в рендере — запрещено.** Паттерн `useState(() => { document.addEventListener(...) })` — баг. Только `useEffect` для подписок
- **beforeunload:** добавлять через ref-паттерн (не на каждый keystroke). Ref хранит `hasContent`, listener регистрируется один раз
- **setTimeout/setInterval в хуках:** всегда хранить в ref и clearTimeout в cleanup. Включая "временные" таймеры типа `setTimeout(() => setFlag(false), 2000)`

### Производительность
- Нет fetch в циклах — batch-операции через один запрос
- Коррелированные подзапросы — заменять на JOIN/CTE
- Внешние API — проксировать через свой route
- **COUNT + данные в одном запросе:** использовать `COUNT(*) OVER()` вместо двух отдельных запросов
- **Polling:** не делать N+1 запросов при периодическом опросе (например, непрочитанные — одним запросом)
- **Polling при скрытой вкладке:** приостанавливать setInterval через `document.addEventListener('visibilitychange', ...)` — не тратить ресурсы сервера когда пользователь не смотрит

### UX-правила
- **a11y:** кнопки без текста → `aria-label`. Модалки → `role="dialog"`, `aria-modal`, focus trap. Ошибки → `aria-live="polite"`. SVG-иконки → `aria-hidden="true"`
- **a11y дропдауны:** `aria-expanded` на кнопке-триггере, закрытие по Escape, навигация стрелками
- **Семантика:** навигация в `<nav>`, контент в `<main>`, карточки в `<article>`. Кликабельные элементы — `<button>`, не `<div onClick>`
- **Focus:** не убирать `outline` без замены. Глобальный `:focus-visible` с `outline: 2px solid var(--accent)`
- **Touch:** минимальный интерактивный элемент 44x44px
- **Мобильная адаптивность:** навигация → гамбургер-меню на < 768px. Тулбары с 4+ кнопками → overflow-меню «...» на узких экранах
- **Обратная связь:** успех/ошибка → Toast (не `alert()` и не `window.confirm()`). Кнопка загрузки → disabled + спиннер (не просто `...`). Опасное действие → `<ConfirmDialog>` (не `window.confirm()`)
- **Toast в хуках:** хуки (`useGameChat`, `useGameNotes`, `useDiceRoller`) не имеют доступа к контексту напрямую. Передавать `addToast` параметром хука: `useGameChat({ ..., addToast })`. НЕ использовать `alert()` в хуках
- **Loading states:** скелетоны (пульсирующие серые блоки), не текст «Загрузка...». Empty state — всегда с CTA-кнопкой («Создать первую заявку»). Error state — всегда с кнопкой «Повторить»
- **Формы:** валидация inline у поля (не общим блоком внизу). Длинные формы → автосохранение в localStorage. Placeholder ≠ label. Предупреждение `beforeunload` при уходе с несохранённым текстом
- **Тексты:** все строки через `useT()`, никакого хардкода на русском — включая error.tsx, админку, empty states
- **Навигация:** вложенные страницы → ссылка «назад» к родительскому списку (не к `/`). Хлебные крошки на страницах глубже 2 уровней
- **Цвета/стили:** CSS-переменные, не хардкод цветов. Тема должна поддерживать preview при выборе

## Планы на будущее (не реализовано)

- Нормальная авторизация: email verification + OAuth (Google/Yandex)
- i18n: русский, английский, испанский, португальский
- Модерация публичных игр: триггер-фразы + жалобы с авто-скрытием
