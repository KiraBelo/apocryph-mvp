# План масштабирования Апокрифа: MVP → Продакшен (3000+ пользователей)

## Контекст

Апокриф — анонимная платформа текстовых ролевых игр. Текущий MVP задеплоен на 31.192.111.43, работает на Next.js 16 + PostgreSQL. Цель — перевести сервис в продакшен-качество: безопасность, модерация, мультиязычность, монетизация, мобильная адаптация.

Все задачи отсортированы от простого к сложному. Каждая фаза самодостаточна — можно остановиться после любой и иметь рабочий продукт.

---

## Фаза 1: Инфраструктура и безопасность (фундамент)

### 1.1 Домен + HTTPS
- Купить домен
- Настроить DNS A-запись на 31.192.111.43
- Установить certbot, получить SSL-сертификат Let's Encrypt
- Обновить nginx: редирект HTTP → HTTPS, SSL-конфиг
- Обновить iron-session: `secure: true` в production

### 1.2 Бэкапы БД
- Скрипт `pg_dump` по крону (ежедневно, хранить 7 дней)
- Ротация старых бэкапов

### 1.3 Rate limiting
- Middleware `src/lib/rateLimit.ts`
- Лимиты: логин (5/мин), регистрация (3/час), создание заявок (10/час), сообщения (30/мин)

### 1.4 Миграции БД
- Папка `migrations/` с нумерованными SQL-файлами
- Простой runner-скрипт: проверяет какие миграции применены, выполняет новые

**Файлы:** `schema.sql`, nginx config, `src/lib/rateLimit.ts`, `migrations/`

---

## Фаза 2: Email-верификация + сброс пароля

### 2.1 Подключение Resend
- `npm install resend`
- `RESEND_API_KEY` в `.env.local`
- Утилита `src/lib/email.ts`

### 2.2 Верификация email при регистрации
- Колонка: `users.email_verified BOOLEAN DEFAULT FALSE`
- Таблица: `email_codes (id, user_id, code CHAR(6), type, expires_at, used)`
- Флоу: регистрация → письмо с кодом → ввод кода → `email_verified = true`
- Без верификации: нельзя создавать заявки и откликаться
- Страница `/auth/verify`, API: `POST /api/auth/verify`, `POST /api/auth/resend-code`

### 2.3 Сброс пароля
- Флоу: email → код → новый пароль
- Страницы `/auth/forgot`, `/auth/reset`

**Файлы:** `src/lib/email.ts`, `src/app/api/auth/verify/route.ts`, `src/app/auth/verify/page.tsx`, `src/app/auth/forgot/page.tsx`, `migrations/002_email_verification.sql`

---

## Фаза 3: Система тегов

### 3.1 Структурированные теги
- Таблицы: `tags (id, slug, name_en, category, approved)`, `tag_i18n (tag_id, lang, name)`, `tag_aliases (tag_id, lang, alias)`, `request_tags (request_id, tag_id)`
- Миграция существующих `requests.tags TEXT[]` → новые таблицы

### 3.2 Автокомплит с fuzzy-matching
- PostgreSQL расширение `pg_trgm` + `similarity()`
- API: `GET /api/tags?q=...&lang=...`
- Компонент `TagAutocomplete.tsx` — подсказки при вводе

### 3.3 Стартовая база
- Топ-300 фандомов + жанры/тропы с переводами RU/EN/ES/PT
- Авто-одобрение: 3+ использования пользовательского тега → `approved = true`

**Файлы:** `migrations/003_structured_tags.sql`, `src/app/api/tags/route.ts`, `src/components/TagAutocomplete.tsx`, `scripts/seed-tags.sql`

---

## Фаза 4: Модерация

### 4.1 Стоп-лист фраз
- Таблица `moderation_words (id, pattern, severity, category)`
- Проверка при создании поста/заявки

### 4.2 Жалобы с автоскрытием
- Доработка `reports`: статус `pending/resolved/dismissed`
- 2+ жалобы от разных пользователей → контент скрыт

### 4.3 Модераторский интерфейс
- `users.role ENUM('user','moderator','admin')`
- `/admin/reports` — разбор жалоб
- `/admin/users` — бан/разбан (`users.banned_at`)

### 4.4 Блокировка пользователей
- Таблица `user_blocks (blocker_id, blocked_id)`
- Взаимное скрытие заявок
- Лимит: 5 бесплатно, без лимита для премиум

**Файлы:** `migrations/004_moderation.sql`, `src/lib/moderation.ts`, `src/app/admin/...`

---

## Фаза 5: i18n — мультиязычный интерфейс

### 5.1 Настройка next-intl
- `npm install next-intl`
- URL-префикс: `/ru/`, `/en/`, `/es/`, `/pt/`
- Middleware для определения языка
- Файлы переводов: `messages/*.json`

### 5.2 Перевод интерфейса
- Извлечь строки → ключи `t('...')`
- Начать с RU + EN

### 5.3 Язык заявки
- `requests.language TEXT NOT NULL DEFAULT 'ru'`
- `users.preferred_langs TEXT[] DEFAULT '{ru}'`
- Фильтр в ленте по языку

**Файлы:** `src/middleware.ts`, `messages/*.json`, все компоненты

---

## Фаза 6: Уведомления + PWA

### 6.1 Email-уведомления
- "Вам ответили в игре" через Resend
- `users.notify_email BOOLEAN DEFAULT TRUE`
- Debounce: не чаще 1 раза в 15 мин на игру

### 6.2 PWA
- `manifest.json`, Service Worker, мета-теги iOS
- Проверка адаптивности на 320-428px

### 6.3 Push-уведомления
- Web Push API + Service Worker
- `push_subscriptions (user_id, endpoint, keys)`

**Файлы:** `public/manifest.json`, `public/sw.js`, `src/lib/push.ts`

---

## Фаза 7: Монетизация

### 7.1 Платёжная система
- ЮKassa (RU) / Stripe (международный)
- `subscriptions (user_id, plan, status, started_at, expires_at)`
- `users.plan ENUM('free','premium') DEFAULT 'free'`

### 7.2 Премиум-фичи
- Расширенные лимиты (заявки, игры, закладки, блокировки)
- Поднятие заявки в ленте (bump, 1 раз/24ч)
- Картинки в постах (S3-хранилище)
- Скрытие от конкретных пользователей (расширенные блокировки)
- Экспорт игры в PDF/EPUB
- Кастомные бейджи/рамки на заявках

### 7.3 Страница подписки
- `/premium` — описание, оплата, управление

**Файлы:** `src/lib/billing.ts`, `src/app/api/billing/...`, `src/app/premium/page.tsx`

---

## Фаза 8: Публичные игры

### 8.1 Публикация
- `games.is_public BOOLEAN DEFAULT FALSE`
- Оба участника должны согласиться

### 8.2 Каталог
- `/public` — лента публичных игр с фильтрами
- Read-only просмотр, SEO-индексация

### 8.3 Премиум: поднятие в каталоге

**Файлы:** `src/app/public/page.tsx`, `src/components/PublicGameView.tsx`

---

## Порядок и зависимости

| # | Фаза | Зависимости | Приоритет |
|---|------|-------------|-----------|
| 1 | Инфраструктура | — | Критично |
| 2 | Email-верификация | Фаза 1 (домен для Resend) | Критично |
| 3 | Система тегов | — | Высокий |
| 4 | Модерация | Фаза 2 (email для уведомлений) | Высокий |
| 5 | i18n | Фаза 3 (теги с переводами) | Средний |
| 6 | Уведомления + PWA | Фаза 2 (email) | Средний |
| 7 | Монетизация | Фаза 1 (домен, HTTPS) | Средний |
| 8 | Публичные игры | Фаза 4 (модерация) | Низкий |

## Верификация

После каждой фазы:
- Проверить на dev-сервере локально
- Задеплоить на 31.192.111.43
- Проверить в браузере (десктоп + мобильный)
- Обновить changelog.md
