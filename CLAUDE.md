# Апокриф — анонимная платформа текстовых ролевых игр

## Стек

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + CSS-переменные (inline styles в компонентах)
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
      globals.css         # дизайн-токены, темы (light/dark), TipTap стили
      auth/               # /auth/login, /auth/register
      requests/           # /requests/new, /requests/[id], /requests/[id]/edit
      games/[id]/         # /games/[id] — игровой диалог
      my/                 # /my/requests, /my/games
      bookmarks/          # /bookmarks
      invite/[token]/     # принятие инвайт-ссылки
      api/
        auth/             # register, login, logout
        requests/         # CRUD заявок, /[id]/respond
        games/            # CRUD игр, messages, notes, leave, report, dice, SSE stream
        bookmarks/        # добавление/удаление закладок
        blacklist/        # чёрный список тегов пользователя
        invites/          # создание/принятие инвайтов
    components/
      Nav.tsx             # навигация
      FeedClient.tsx      # лента заявок с фильтрами и тег-чипами
      RequestCard.tsx     # карточка заявки
      RequestForm.tsx     # форма создания/редактирования заявки
      RequestDetailClient.tsx  # просмотр заявки
      MyRequestsClient.tsx     # мои заявки
      GameDialogClient.tsx     # игровой диалог (IC/OOC/Dice, SSE)
      MyGamesClient.tsx        # мои игры
      RichEditor.tsx      # TipTap-редактор для постов
      OocEditor.tsx       # редактор OOC-сообщений
      InviteClient.tsx    # страница принятия инвайта
      SettingsContext.tsx  # контекст настроек (тема, шрифт, пресеты тегов)
      SettingsPanel.tsx   # панель настроек
      ThemeProvider.tsx    # провайдер темы
    lib/
      db.ts               # Pool + query/queryOne хелперы
      session.ts          # getSession/getUser (iron-session)
      auth.ts             # хелперы авторизации
      sanitize.ts         # настройки sanitize-html
      fonts.ts            # конфиг шрифтов
      sse.ts              # Server-Sent Events хелперы
```

## База данных

Таблицы: `users`, `requests`, `games`, `game_participants`, `messages`, `bookmarks`, `invites`, `user_tag_blacklist`, `game_notes`, `reports`

- UUID первичные ключи (pgcrypto)
- Теги заявок: `TEXT[]`, автоматический lowercase через триггер
- Сообщения имеют тип: `ic` (in-character), `ooc` (out-of-character), `dice`
- Участники игры: nickname + avatar per game, `left_at`/`leave_reason` при выходе
- Seed-юзеры: luna/wolf/ember/starfall@apocryph.test, пароль: `apocryph123`

## Дизайн-система

- Два режима: light (тёплый пергамент) и dark (глубокий тёмный)
- CSS-переменные: `--bg`, `--bg-2`, `--bg-3`, `--text`, `--text-2`, `--accent`, `--accent-2`, `--accent-dim`, `--border`
- Light accent: `#8b1a1a` (тёмно-красный). Dark accent: `#c4b5f4` (лавандовый)
- Шрифты: `--serif` (Cormorant Garamond), `--serif-body` / `--site-font` (Georgia), `--mono` (Courier Prime)
- Стили преимущественно inline (React CSSProperties), не CSS-модули
- Метки секций: `fontFamily: var(--mono)`, маленький uppercase с letter-spacing

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

## Планы на будущее (не реализовано)

- Нормальная авторизация: email verification + OAuth (Google/Yandex)
- i18n: русский, английский, испанский, португальский
- Модерация публичных игр: триггер-фразы + жалобы с авто-скрытием + ручная модерация
