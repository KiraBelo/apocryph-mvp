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
```

База данных: `psql -U postgres -d apocryph < schema.sql`

## Структура проекта

```
product-mvp/
  schema.sql              # схема БД + seed data (16 заявок, 4 тестовых юзера)
  .env.local              # DATABASE_URL, SESSION_SECRET
  src/
    app/
      page.tsx            # главная — лента заявок
      layout.tsx          # корневой layout (Nav, SettingsPanel, SettingsProvider)
      globals.css         # дизайн-токены, темы, TipTap стили, CSS-классы компонентов
      auth/               # /auth/login, /auth/register
      requests/           # /requests/new, /requests/[id], /requests/[id]/edit
      games/[id]/         # /games/[id] — игровой диалог
      my/                 # /my/requests, /my/games
      bookmarks/          # /bookmarks
      feed/               # /feed — лента заявок (альтернативный вход)
      library/            # /library, /library/[id] — публичная библиотека игр
      invite/[token]/     # принятие инвайт-ссылки
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
      hooks/              # хуки игрового диалога
        useGameChat.ts, useGameSSE.ts, useGameSearch.ts
        useGameNotes.ts, useDiceRoller.ts
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
      __tests__/          # тесты lib (auth, rate-limit, sanitize, stoplist)
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

- Темы: light (пергамент), dusk (сумерки), midnight (полночь), redroom (красная комната), neon (неон)
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
- SQL-запросы: прямые через `query()` / `queryOne()` / `withTransaction()` из `lib/db.ts`, параметризированные ($1, $2...)
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

## Планы на будущее (не реализовано)

- Нормальная авторизация: email verification + OAuth (Google/Yandex)
- i18n: русский, английский, испанский, португальский
- Модерация публичных игр: триггер-фразы + жалобы с авто-скрытием
