# Changelog — Апокриф

## 2026-03-14 — Исправления по аудиту Harness Engineering (19 фиксов)

### CRITICAL — Безопасность API
- **SSE stream без проверки участника** — добавлена проверка `game_participants` + бана перед SSE-подключением
- **7 write-эндпоинтов без проверки бана** — PATCH requests/[id], PATCH games/[id], PATCH messages/[msgId], POST dice, POST leave, POST report, PATCH messages/[msgId] переведены на `requireUser()`
- **Admin layout без проверки бана** — `getUser()` → `requireMod()`, забаненные модераторы больше не видят админку
- **Self-ban guard** — админ/мод не может забанить или изменить роль самому себе (`cannotModifySelf`)

### CRITICAL — XSS
- **request.body без санитизации на чтении** — `sanitizeBody()` применяется при выдаче body в GET /api/requests и GET /api/requests/[id]
- **note.content без санитизации** — `sanitizeBody()` применяется при записи заметок (POST/PATCH notes)

### CRITICAL — Schema
- **ooc_enabled DEFAULT true → false** — исправлено в CREATE TABLE
- **Unique index reports.status** — колонка status добавлена в CREATE TABLE, index создаётся корректно

### IMPORTANT — Безопасность
- **Security headers** — X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy в next.config.ts
- **SESSION_SECRET проверка** — приложение не стартует без SESSION_SECRET длиной ≥32 символов
- **Email валидация** — базовая regex-проверка формата email при регистрации
- **req.json() без try/catch** — login/register корректно обрабатывают невалидный JSON (400 вместо 500)
- **GET invites/[token]** — возвращает только `token, request_id, used_at, title, type` вместо `i.*`
- **Параметр q** — ограничен 200 символами для защиты от DoS через тяжёлый ILIKE

### IMPORTANT — Производительность
- **3 индекса БД** — `idx_games_request_id`, `idx_requests_author`, `idx_messages_participant`
- **Pool connectionTimeoutMillis** — добавлен таймаут 5 сек, ROLLBACK failure не глотает оригинальное исключение

### IMPORTANT — Логические ошибки Frontend
- **toggleBookmark** — проверяет `res.ok` перед переключением UI, при ошибке состояние сохраняется
- **deleteRequest** — ждёт ответа сервера (`await`), удаляет из списка только при `res.ok`
- **TOCTOU race на лимит закладок** — count + insert обёрнуты в `withTransaction`

### Скрытие заявок забаненных
- Публичная лента фильтрует заявки по `u.banned_at IS NULL` (JOIN users)

## 2026-03-13 — Аудит Harness Engineering (31 находка)

### CRITICAL — Безопасность API (8)
- **SSE stream без проверки участника** (`games/[id]/messages/stream/route.ts`) — любой залогиненный может подслушивать чужие игры через SSE
- **6 write-эндпоинтов без проверки бана** — PATCH requests/[id], PATCH games/[id], PATCH messages/[msgId], POST dice, POST leave, POST report используют `getUser()` вместо `requireUser()`
- **Admin routes без проверки `error === 'banned'`** — admin/reports, admin/users и их подроуты пропускают забаненных модераторов

### CRITICAL — XSS (3)
- **`request.body` без санитизации на чтении** — RequestCard, MyRequestsClient, RequestDetailClient рендерят HTML через `dangerouslySetInnerHTML` без `sanitizeBody()`
- **Экспорт без санитизации** — `exportHtml()`/`exportPdf()` в GameDialogClient вставляют `msg.content` напрямую в HTML
- **`note.content` без санитизации** — GameDialogClient рендерит заметки через `dangerouslySetInnerHTML`

### CRITICAL — Schema (2)
- **Unique index `idx_reports_game_reporter_pending`** ссылается на колонку `status` до её создания — на fresh install index не создаётся
- **`ooc_enabled DEFAULT true`** в CREATE TABLE противоречит `DEFAULT false` в миграции и CLAUDE.md

### IMPORTANT — Безопасность (6)
- **CSS injection через `style`** на `<span>`/`<p>` в sanitize.ts — position, z-index, width проходят фильтр
- **`SESSION_SECRET!`** без проверки при старте — undefined password = крэш
- **Нет security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy отсутствуют в next.config.ts
- **Email не валидируется** при регистрации — можно зарегистрироваться с невалидным email
- **`req.json()` без try/catch** в login/register — невалидный JSON = 500 со стектрейсом
- **GET invites/[token]** возвращает `i.*` — лишние поля наружу

### IMPORTANT — Производительность / Индексы (5)
- **Нет `idx_games_request_id`** — full scan при создании/join игры
- **Нет `idx_requests_author`** — full scan «мои заявки»
- **Нет `idx_messages_participant`** — full scan FK cascade
- **Pool без `connectionTimeoutMillis`** — зависает при недоступной БД
- **ROLLBACK failure** в `withTransaction` глотает оригинальное исключение

### IMPORTANT — Логические ошибки Frontend (7)
- **`toggleBookmark`** в RequestCard не проверяет `res.ok` — UI флипается при ошибке сервера
- **`deleteRequest`** в MyRequestsClient — fire-and-forget без await и отката
- **Nav.tsx setInterval fetch** без AbortController — setState после unmount
- **`setSearchLoading(false)`** в GameDialogClient вне try — loading мигает при abort
- **TOCTOU race** на лимит 50 закладок — count + insert без транзакции
- **Админ может забанить сам себя** — нет self-ban guard
- **Параметр `q`** в requests GET без ограничения длины → тяжёлый ILIKE

## 2026-03-12 (3) — Стоп-лист запрещённых фраз

### Таблицы БД
- `stop_phrases` — фразы с полями `phrase`, `note`, `is_active`, `created_by`; уникальный индекс по активным
- `stop_violations` — лог нарушений: `game_id`, `user_id`, `phrase_id`, `matched_text`, `auto_hidden`

### Утилита (`lib/stoplist.ts`)
- In-memory кеш активных фраз с TTL 60 сек, инвалидация при CRUD
- `checkStopList()` — strip HTML → lowercase → substring-match, возвращает контекст ±25 символов
- `VIOLATION_THRESHOLD = 3` — авто-скрытие игры после 3 нарушений

### Интеграция в POST messages
- Проверка стоп-листа после санитизации, перед INSERT сообщения
- При совпадении: запись в `stop_violations`, проверка порога → авто-скрытие, ответ 422 `stopListBlocked`
- GameDialogClient показывает локализованную ошибку при блокировке

### Admin API
- `GET/POST /api/admin/stop-list` — список фраз (пагинация, поиск) + создание (мин 3, макс 200 символов)
- `PATCH/DELETE /api/admin/stop-list/[id]` — изменение/удаление фразы
- `GET /api/admin/violations` — лог нарушений (пагинация, фильтр по game_id)

### Admin UI (`/admin/stop-list`)
- Два таба: Фразы (добавление, вкл/выкл, удаление) и Нарушения (лог со ссылками на игры)
- Дашборд: карточка «Нарушения (7д)» со счётчиком

### i18n
- Ключи `admin.stopList.*` (12 шт.) + `errors.stopListBlocked` в ru.ts и en.ts

## 2026-03-12 (2) — Security review: исправления безопасности

### Critical
- **Инвайты — проверка владельца**: `POST /api/invites` теперь проверяет `author_id === user.id`, чужие заявки нельзя инвайтить
- **Инвайты — race condition**: `POST /api/invites/[token]` обёрнут в `withTransaction` + `SELECT ... FOR UPDATE`, двойное использование инвайта невозможно
- **requireMod() — роль из БД**: роль и бан-статус теперь проверяются из БД, а не из cookie. Разжалованный модератор теряет доступ сразу

### High
- **GET /api/requests/[id] — видимость**: неопубликованные и приватные заявки доступны только автору
- **CSS-санитизация**: regex для `color`/`background-color` теперь требует полное значение `rgb(R,G,B)`, предотвращает CSS injection через `url()`
- **Дедупликация репортов**: unique index `(game_id, reporter_id) WHERE status='pending'` + проверка в API. Спам жалобами невозможен
- **XSS в экспорте**: `escapeHtml()` для никнеймов и заголовков в HTML/PDF экспорте
- **XSS в цитировании**: `quotePost()` экранирует текст перед вставкой в HTML-шаблон

### Medium
- **Stale closure в редакторах**: `useEffect` в RichEditor/OocEditor получил правильные deps `[editor, content]`
- **AbortController в поиске**: GameDialogClient search fetch отменяется при unmount, нет setState после размонтирования
- **Пустые посты**: `send()` проверяет `<p></p>` (пустой TipTap документ), не только `.trim()`
- **Подтверждение смены роли**: AdminUsers показывает `confirm()` перед изменением роли пользователя

## 2026-03-12 — Фаза 4: Модерация + Админ-панель

### Роли и баны
- Роли пользователей: `user`, `moderator`, `admin` (колонка `users.role`)
- Бан пользователей: `banned_at` + `ban_reason` в таблице users
- Проверка бана при логине (403 + причина), баннер на каждой странице для забаненных
- Write-эндпоинты (создание заявки, отклик, сообщения, инвайты) проверяют бан через `requireUser()`
- Иерархия: модератор не может банить/менять роль модератора или админа

### Жалобы и автоскрытие
- Статусы жалоб: `pending`, `resolved`, `dismissed`
- Автоскрытие: 2+ жалобы от разных пользователей → `moderation_status = 'hidden'`
- Resolve → игра остаётся скрытой (read-only для участников)
- Dismiss → если все pending жалобы отклонены, игра возвращается в `visible`
- Баннер модерации в GameDialogClient, редактор скрыт для замороженных игр
- Проверка `moderation_status` при отправке сообщений (403 `gameFrozen`)

### Админ-панель (/admin)
- Дашборд с 4 счётчиками (pending жалобы, пользователи, забаненные, скрытые игры)
- /admin/reports — табы (ожидают/решено/отклонено), resolve/dismiss, hide/unhide игры
- /admin/users — поиск по email, бан (модал с причиной), разбан, смена роли
- Доступ только для moderator/admin (layout с redirect)

### Bypass для модераторов
- Модераторы могут открыть любую игру (bypass проверки участника)
- GET /api/games/[id] возвращает email участников для модераторов (деанонимизация)
- Ссылка «Модерация» в Nav для mod/admin

### API
- `POST/GET /api/admin/reports` — список жалоб с фильтром и пагинацией
- `PATCH /api/admin/reports/[id]` — resolve/dismiss
- `GET /api/admin/users` — поиск пользователей
- `PATCH /api/admin/users/[id]` — ban/unban/set_role
- `PATCH /api/admin/games/[id]` — moderation_status

### Новые файлы
- `BanBanner.tsx` — красный баннер бана под Nav
- `AdminReports.tsx`, `AdminUsers.tsx` — клиентские компоненты админки
- `admin/layout.tsx`, `admin/page.tsx`, `admin/reports/page.tsx`, `admin/users/page.tsx`
- 6 API routes в `/api/admin/`

### i18n
- Ключи: `nav.admin`, секция `admin.*` (~25 ключей), `ban.*`, `errors.banned`, `errors.gameFrozen`

## 2026-03-10 (3) — i18n: переключалка языка (RU + EN)

### Инфраструктура
- Создана система i18n: `src/i18n/ru.ts` (source of truth), `en.ts` (английские переводы), `index.ts` (хук useT())
- Тип `Translations` с `Widen<>` — TypeScript проверяет наличие всех ключей в en.ts, но позволяет разные значения строк
- `lang` добавлен в SettingsContext, сохраняется в localStorage (`apocryph-lang`), устанавливает `<html lang="...">`
- Переключалка языка в SettingsPanel (Русский / English)

### Мигрированные компоненты (все UI-строки через useT())
- Nav.tsx, FeedClient.tsx, RequestCard.tsx, RequestForm.tsx
- RequestDetailClient.tsx, MyRequestsClient.tsx, MyGamesClient.tsx
- GameDialogClient.tsx (~90 строк), InviteClient.tsx, TagAutocomplete.tsx
- OocEditor.tsx, RichEditor.tsx (тулбар), BookmarksClient.tsx (новый)
- SettingsPanel.tsx, auth/login, auth/register

### Серверные страницы → клиентские обёртки
- `InvalidInviteClient.tsx` — для недействительных инвайт-ссылок
- `RequestFormWrapper.tsx` — обёртка с заголовком для new/edit request
- `MyRequestsHeader.tsx` — заголовок страницы "Мои заявки"
- `NotFoundClient.tsx` — страница 404

### Шрифты
- `lib/fonts.ts` — `FontGroup.label` → `FontGroup.key` (i18n-ключ), группы шрифтов переведены

### ~470 русских строк заменены на вызовы t()
- Переводятся только строки UI (кнопки, метки, ошибки, тултипы)
- Пользовательский контент (посты, заявки, OOC) НЕ переводится
- Landing.tsx отложен (маркетинговый контент)
- layout.tsx metadata остаётся на русском (server-side)

## 2026-03-10 (2) — Код-ревью: 25 багов найдено и исправлено

### Безопасность (критичные)
- Убрана утечка email через GET /api/games/[id] (JOIN users больше не возвращает email)
- Убрана утечка author_email из GET /api/requests (убран JOIN users, явный список колонок)
- GET /api/games/[id]/messages теперь проверяет что запрашивающий — участник игры
- Инвайт теперь проверяет used_at при принятии (нельзя принять бесконечно)
- Race condition в respond: обёрнуто в транзакцию + SELECT FOR UPDATE
- schema.sql обновлён: добавлены messages.type, last_read_at, last_read_ooc_at и др.

### Данные и логика (важные)
- requests/[id] — приватные заявки скрыты от чужих пользователей
- games/[id]/page.tsx — user_id других участников заменяется на participant_id перед отправкой клиенту
- invite/[token] — использованный инвайт показывает ошибку вместо формы
- leave/route.ts — проверка участника + guard на повторный выход (left_at IS NULL)
- report/route.ts — жалоба только от участника игры
- requests/route.ts — OFFSET параметризирован ($N вместо интерполяции), убрана утечка email
- sanitize.ts — убран iframe (clickjacking), ужесточены стили (только hex/rgb цвета), убран font-family
- bookmarks — фильтрация: показываются только active + is_public заявки
- SettingsContext — gameFont теперь применяется при загрузке (добавлен в applyAllToDOM)

### UX и надёжность
- send() — проверка ответа сервера, при ошибке контент не теряется + alert
- submitNote() — проверка ответа + try/catch
- saveNoteEdit() — проверка ответа + try/catch
- notes useEffect — добавлен catch (нет вечного loading при ошибке сети)
- Scroll timers — очищаются при unmount (scrollTimerRef + scrollStopRef)
- FeedClient load() — try/catch/finally, нет вечного loading
- MyRequestsClient inviteUrl — привязан к конкретной карточке (не глобальный)
- InviteClient — try/catch на fetch
- ooc_enabled — переключать может только создатель игры (первый участник)

## 2026-03-10 — UX-улучшения: теги, форма заявки, игровой диалог

### Теги
- Персонажи (`character_type`) теперь привязываются к фандому (как пейринги)
- Создание тега по Enter вместо кнопки «+ Создать тег»
- Фикс: дропдаун не закрывается при выборе категории/фандома (skipCloseRef вместо stopPropagation)
- Чипы тегов на полную ширину в ленте заявок (FeedClient, `chipsOutside` prop)

### Форма заявки (RequestForm)
- Бейджи типа/основы/пейринга/NSFW отображаются в секции тегов, обновляются реактивно
- Бейдж «Пейринг не важен» показывается при выборе «не важно»

### Игровой диалог (GameDialogClient)
- Настройки перекомпонованы: 3 группы (Персонаж / Оформление / Вкладки)
- Feed-раскладка: аватары и метаданные чередуются по сторонам (как в диалоге)
- Поиск: клик на результат скроллит к сообщению + подсветка на 2 сек, список не закрывается
- OOC по умолчанию выключен

### Документация
- Обновлён CLAUDE.md: деплой, игровой диалог, теги
- Обновлён план масштабирования: Фаза 3 отмечена готовой, добавлены известные баги

## 2026-03-09 (3) — Фиксы тегов + hardening

### Баги
- Фикс: клик «+ Создать тег» больше не закрывает дропдаун — категории теперь видны
- Убран разделитель запятой — запятая теперь обычный символ в строке ввода тегов

### Лимиты
- Лимит длины тега: 50 символов (фронт maxLength + API валидация)
- Лимит длины поискового запроса: 100 символов (API)
- Лимит длины имени тега: 100 символов (API)

### Hardening
- Экранирование LIKE-спецсимволов (`%`, `_`, `\`) в поисковых запросах
- Транзакция для создания тега + tag_i18n (атомарность)
- Индексы БД: `parent_tag_id` (partial), `usage_count DESC`

## 2026-03-09 (2) — UX тегов: категории при создании, пейринги, чипы

### TagAutocomplete
- **Чипы под строкой ввода**: выбранные теги отображаются как бейджи под input, а не внутри
- **Выбор категории при создании тега**: нажатие «+ Создать тег» открывает кнопки категорий (фандом, жанр, троп, сеттинг, персонаж, пейринг, настроение, формат, другое)
- **Пейринг → привязка к фандому**: при выборе категории «пейринг» открывается поиск фандома с автокомплитом; пейринг-тег сохраняется с `parent_tag_id`
- **Backspace** больше не удаляет чипы (чипы отдельно от строки ввода)
- **Убраны алиасы и счётчик** из подсказок дропдауна

### База данных
- **Новая категория `pairing`** в CHECK constraint таблицы `tags`
- **Новая колонка `parent_tag_id`** в `tags` — FK на родительский тег (фандом → пейринг)

### API
- **POST /api/tags**: принимает `category` и `parent_tag_id`
- **GET /api/tags?parent_id=X**: возвращает дочерние теги (пейринги фандома)

---

## 2026-03-09 — Фаза 3: Структурированная система тегов

### База данных
- **Новые таблицы**: `tags`, `tag_i18n`, `tag_aliases`, `request_tags` — нормализованная система тегов с категориями, i18n, алиасами
- **pg_trgm**: fuzzy-поиск по тегам (GIN-индексы)
- **Auto-approve триггер**: тег автоматически одобряется после 3+ использований
- **Seed-данные**: ~300 тегов в 8 категориях (fandom, genre, trope, setting, character_type, mood, format, other) + ~100 алиасов
- **Dual-write**: `request_tags` (junction) + `requests.tags TEXT[]` (кэш)

### API
- **GET /api/tags?q=...**: автокомплит с fuzzy-matching, фильтр по категории, i18n
- **POST /api/tags**: создание пользовательских тегов (approved=false, лимит 10/день)

### Компоненты
- **TagAutocomplete.tsx**: подсказки при вводе, категории с цветами, создание новых тегов, клавиатурная навигация
- **RequestForm.tsx**: текстовый ввод тегов заменён на TagAutocomplete
- **FeedClient.tsx**: фильтр по тегам заменён на TagAutocomplete

### Инфраструктура
- **withTransaction()**: хелпер для атомарных операций с БД

---

## 2026-03-08 (3)

### Игровой диалог
- **OOC по умолчанию выключен**: вкладка «Оффтоп» теперь отключена для новых игр, включается вручную в настройках игры
- **Отступы в режиме «Диалог»**: добавлены горизонтальные отступы 4rem для лучшей читаемости
- **Сворачиваемый редактор**: редактор постов сворачивается при прокрутке сообщений, раскрывается по наведению мыши
- **Аватар обновляется везде**: при смене аватара в настройках он обновляется на всех сообщениях пользователя в игре
- **Экспорт**: убраны описания под кнопками форматов
- **Настройки перенесены**: «Раскладка постов» и «Заметки» перемещены из общих настроек в меню конкретной игры

---

## 2026-03-08 (2)

### Игровой диалог
- **Таймстамп сообщений**: каждое IC-сообщение теперь показывает дату и время отправки (дд.мм, чч:мм) рядом с никнеймом — во всех раскладках (book, dialog, feed)

### Баг-фиксы
- **Спойлеры**: текст был полностью невидим (color: transparent + blur без фона) — заменён на тёмную плашку с раскрытием по клику
- **Хайлайт текста**: тег `<mark>` вырезался sanitize-html — добавлен в allowedTags + разрешены атрибуты data-color и style

### UX-улучшения
- **Теги в ленте**: плейсхолдер «Добавить тег...» → «Теги через запятую или Enter»
- **Множественный ввод тегов**: можно вставить «тег1, тег2, тег3» — все добавятся сразу, дубликаты отфильтруются

---

## 2026-03-08

### Landing page — интеграция в Next.js
- Лендинг из `results/landing.html` перенесён в React-компонент `src/components/Landing.tsx`
- Стили вынесены в CSS Module `src/components/Landing.module.css`
- `/` показывает лендинг для анонимных пользователей, авторизованных редиректит на `/feed`
- Лента заявок перенесена с `/` на `/feed`
- CTA-кнопки ведут на `/auth/register`, "Войти" — на `/auth/login`
- Логотип и ссылка "Лента" в Nav.tsx обновлены на `/feed`

### Landing page — размеры и пропорции
- Контейнер лендинга расширен с 940px до 1050px (совпадает с шириной ленты)
- Базовый шрифт уменьшен с 22px до 18px
- h1: `clamp(2.8rem, 6.5vw, 4.8rem)` → `clamp(2.2rem, 4.5vw, 3.2rem)`
- h2: `clamp(1.9rem, 3.8vw, 2.8rem)` → `clamp(1.5rem, 3vw, 2.2rem)`
- Hero padding: 7rem/5rem → 5rem/4rem
- Section padding: 6rem → 4.5rem
- Final CTA padding: 9rem → 6rem
- Кнопки в навбаре уменьшены: font-size .95rem → .8rem, padding .6rem 1.6rem → .35rem 1.1rem

### Seed data
- Удалены старые заявки, создан `seed-fresh.sql`
- 4 тестовых пользователя: luna, wolf, ember, starfall (пароль: apocryph123)
- 20 заявок во всех комбинациях фильтров (type, content_level, fandom_type, pairing)
- 2 тестовые игры с ~10 постами каждая (IC + OOC)

### Страница регистрации
- Подпись изменена: "Без подтверждения письма. Начни играть сразу." → "Найди игру уже сегодня."

### UX-улучшения
- Placeholder тегов: "Введите тег..." → "Введите тег и нажмите запятую или Enter"
- OOC-вкладка в играх включена по умолчанию (`ooc_enabled DEFAULT true`)
- Убрана решётка `#` из отображения тегов (лента, карточки, чёрный список)
- При вводе тега `#` автоматически удаляется

### Миграции БД (сервер)
- Добавлена колонка `game_participants.last_read_ooc_at`
- Изменён дефолт `games.ooc_enabled` на `true`

### Авторизация — фиксы
- Редирект после логина/регистрации изменён с `/` на `/feed`
- Secure cookie отключена для HTTP: `secure` теперь зависит от `USE_HTTPS=true` в `.env.local` (без HTTPS браузер отбрасывал куку)
- Выданы права пользователю `apocryph` на все таблицы БД на сервере
- Добавлены 5 тестовых аккаунтов: player1-5@apocryph.test (пароль: play2026)

### Баг-фиксы
- **PATCH /api/requests/[id]**: смена статуса из «Мои заявки» больше не затирает все поля заявки (title, body, tags → NULL). Добавлена поддержка partial update (только status)
- **Инвайт-ссылки**: на HTTP `navigator.clipboard` недоступен — теперь ссылка показывается визуально в UI (лента, мои заявки, страница заявки)
- **Теги**: убрана решётка `#` из оставшихся мест (страница заявки, мои заявки)

### Деплой
- Проект задеплоен на сервер 31.192.111.43
- Ubuntu 22.04, systemd service, nginx reverse proxy (80 → 3000)
- PostgreSQL 14 с данными из seed-fresh.sql
- Добавлена колонка `type` в таблицу messages на сервере (миграция)
