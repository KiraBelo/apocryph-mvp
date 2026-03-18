# Changelog

## 2026-03-18 — Обработка ошибок + безопасность

### Клиентские ошибки (21 исправление)
Все fetch-вызовы в проекте теперь обрабатывают ошибки сети и отказы сервера:
- **Хуки:** useDiceRoller, useGameChat (edit, pagination, OOC load), useGameNotes (delete), useGameSSE (dice parse)
- **Игровой диалог:** выход из игры, жалобы, завершение/публикация, настройки
- **Компоненты:** MyRequests (статус, удаление), MyGames (звёздочка, скрытие), Feed (загрузка, закладки, чёрный список), RequestDetail (статус, удаление), RequestCard (закладки), Nav (polling), Admin (отчёты, стоп-лист)
- Оптимистичные обновления теперь откатываются при ошибке сервера
- FeedClient показывает сообщение об ошибке вместо пустой ленты

### Безопасность
- **Banner URL** — дополнительная проверка на спецсимволы `)(;"'` для защиты от CSS-инъекций

---

## 2026-03-16 — Масштабируемость (Фаза 2)

- **DB pool увеличен** — с 10 до 25 подключений + таймаут простоя 30с (`db.ts`)
- **Индекс messages** — `idx_messages_game_type(game_id, type, created_at)` для быстрой фильтрации IC/OOC (`schema.sql`)
- **CSP заголовок** — Content-Security-Policy защищает от XSS даже если санитизация обойдена (`next.config.ts`)
- **React.memo для MessageBubble** — сообщения не перерисовываются если не изменились (`MessageBubble.tsx`)
- **SSE лимит подключений** — максимум 5 SSE на пользователя, защита от DoS (`sse.ts`, `stream/route.ts`)
- **Деплой с откатом** — `deploy.sh` автоматически откатывается к старой сборке если новая упала

---

## 2026-03-16 — Декомпозиция GameDialogClient + Безопасность (Фаза 1)

### Рефакторинг: GameDialogClient.tsx (1726 → 313 строк, -82%)

Главный компонент игрового диалога разбит на независимые части.

**Кастомные хуки (src/components/hooks/):**
- `useGameSSE` — подключение к серверу в реальном времени (SSE)
- `useGameChat` — отправка/редактирование сообщений, пагинация
- `useGameNotes` — CRUD заметок (личный дневник)
- `useGameSearch` — поиск по сообщениям и заметкам
- `useDiceRoller` — бросок кубиков

**Компоненты (src/components/game/):**
- `MessageFeed` — лента сообщений + пагинация
- `MessageBubble` — отдельное сообщение (3 раскладки: диалог/лента/книга)
- `MessageEditor` — редактор постов (IC/OOC) + панель кубиков
- `NotesTab` — вкладка заметок
- `SearchPanel` — панель поиска
- `SettingsModal` — настройки игры
- `StatusBanners` — баннеры статуса (завершение, публикация)
- `ExportModal` — экспорт игры (txt/html/md/pdf)
- `TopBar` — верхняя панель с вкладками и кнопками
- `Modal` — компонент модального окна
- `MsgContent` — мемоизированный рендер HTML-контента
- `types.ts` — интерфейсы (Message, Participant, NoteEntry и др.)
- `utils.ts` — UI-утилиты
- `exportUtils.ts` — функции экспорта

### Безопасность (Фаза 1)

- **Cookie secure по умолчанию** — сессионные куки теперь отправляются только по HTTPS в продакшене (`session.ts`)
- **Rate limiting** — ограничение попыток входа (5/15 мин) и регистрации (3/час) с одного IP (`rate-limit.ts`, `login/route.ts`, `register/route.ts`)
- **Криптографический генератор для кубиков** — `Math.random()` → `crypto.randomInt()` (`dice/route.ts`)
- **Экранирование LIKE-запросов** — спецсимволы `%` и `_` экранируются в поиске публичных игр (`public-games/route.ts`)
- **escapeHtml для заголовков** — заголовок заявки экранируется при создании первого поста игры (`respond/route.ts`)
- **Проверка бана в publish-consent** — `getUser()` → `requireUser()` с проверкой бана (`publish-consent/route.ts`)
- **Валидация URL аватаров/баннеров** — сервер принимает только `http://` и `https://` ссылки (`games/[id]/route.ts`)

### Новые файлы

- `src/components/hooks/useGameSSE.ts`
- `src/components/hooks/useGameChat.ts`
- `src/components/hooks/useGameNotes.ts`
- `src/components/hooks/useGameSearch.ts`
- `src/components/hooks/useDiceRoller.ts`
- `src/components/game/MessageFeed.tsx`
- `src/components/game/MessageBubble.tsx`
- `src/components/game/MessageEditor.tsx`
- `src/components/game/NotesTab.tsx`
- `src/components/game/SearchPanel.tsx`
- `src/components/game/SettingsModal.tsx`
- `src/components/game/StatusBanners.tsx`
- `src/components/game/ExportModal.tsx`
- `src/components/game/TopBar.tsx`
- `src/components/game/Modal.tsx`
- `src/components/game/MsgContent.tsx`
- `src/components/game/types.ts`
- `src/components/game/utils.ts`
- `src/components/game/exportUtils.ts`
- `src/lib/rate-limit.ts`
- `code-review.md` — полный аудит проекта (31 находка)

### Изменённые файлы

- `src/components/GameDialogClient.tsx` — переписан как тонкий оркестратор (1726 → 313 строк)
- `src/lib/game-utils.ts` — добавлены htmlToText, isSMSOnly, downloadFile, paginationRange, NOTE_COLLAPSE_CHARS
- `src/lib/session.ts` — cookie secure по умолчанию в production
- `src/lib/rate-limit.ts` — новый in-memory rate limiter
- `src/app/api/auth/login/route.ts` — rate limiting (5 попыток/15 мин)
- `src/app/api/auth/register/route.ts` — rate limiting (3 регистрации/час)
- `src/app/api/games/[id]/dice/route.ts` — crypto.randomInt
- `src/app/api/games/[id]/route.ts` — валидация URL аватаров/баннеров
- `src/app/api/games/[id]/publish-consent/route.ts` — requireUser + ban check
- `src/app/api/public-games/route.ts` — экранирование LIKE
- `src/app/api/requests/[id]/respond/route.ts` — escapeHtml для title

---

## 2026-03-15

### Жизненный цикл игр + Библиотека

- **Завершение игр:** Оба участника ставят флажок «Готов завершить» → игра завершается, IC-посты замораживаются, OOC остаётся доступен. Любой участник может переоткрыть игру.
- **Публикация в Библиотеку:** После завершения оба участника могут согласиться на публикацию (минимум 20 IC-постов). Любой может отозвать согласие.
- **Уведомления о предложениях:** Циферка на «Игры» в навигации + баннер на карточке игры + баннер внутри игры, когда соигрок предлагает завершить или опубликовать.
- **Библиотека (`/library`):** Публичный каталог опубликованных игр, доступен без авторизации. Фильтры (тип, фандом, пейринг, контент, теги, текстовый поиск), пагинация.
- **Чтение игры (`/library/[id]`):** Read-only просмотр IC-сообщений в трёх раскладках (диалог/лента/книга). Без OOC, без user_id.
- **Табы «Мои игры»:** 5 табов вместо 3 — Активные, Завершённые, Неактивные, Избранные, Опубликованные.
- **Ссылка «Библиотека» в навигации** — видна всем, включая анонимных пользователей.

### Защита от спама заявками

- **Rate limit:** Максимум 5 заявок в день.
- **Кулдаун:** Минимум 2 минуты между заявками.
- **Дубликаты:** Нечёткое сравнение (pg_trgm, порог 0.7) по названию и телу заявки за 24 часа. Поймает даже если поменять пару слов.

### Новые файлы

- `src/app/api/games/[id]/finish/route.ts` — API завершения/переоткрытия
- `src/app/api/public-games/route.ts` — лента публичных игр
- `src/app/api/public-games/[id]/route.ts` — одна публичная игра
- `src/app/library/page.tsx` — страница библиотеки
- `src/app/library/[id]/page.tsx` — страница чтения игры
- `src/components/LibraryClient.tsx` — каталог с фильтрами
- `src/components/PublicGameViewer.tsx` — read-only viewer
- `src/lib/game-utils.ts` — утилиты (escapeHtml, feedPostBg)

### Изменённые файлы

- `schema.sql` — +status, +finished_at в games; +finish_consent в game_participants
- `src/app/api/games/[id]/leave/route.ts` — сброс finish_consent при выходе
- `src/app/api/games/[id]/messages/route.ts` — блокировка IC в finished
- `src/app/api/games/[id]/publish-consent/route.ts` — проверка status='finished', ≥20 IC-постов
- `src/app/api/games/unread-count/route.ts` — уведомления о предложениях завершения/публикации
- `src/app/api/requests/route.ts` — антиспам (rate limit, cooldown, fuzzy duplicate)
- `src/app/games/[id]/page.tsx` — передача status, finish_consent
- `src/app/my/games/page.tsx` — partner_finish_consent, partner_publish_consent
- `src/components/GameDialogClient.tsx` — баннеры, флажки, блокировка IC-редактора
- `src/components/MyGamesClient.tsx` — 5 табов, баннеры предложений
- `src/components/Nav.tsx` — ссылка «Библиотека», уведомления о предложениях
- `src/components/RequestForm.tsx` — отображение ошибок антиспама
- `src/i18n/ru.ts`, `src/i18n/en.ts` — ~30 новых ключей
