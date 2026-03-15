# Changelog

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
