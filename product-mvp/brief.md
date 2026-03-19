# Бриф: Вкладка «Правка» — подготовка к публикации
Дата: 2026-03-19

## Задача
Заменить текущий неудачный UX (чекбоксы + плавающий бар удаления в IC-вкладке) на отдельную вкладку «Правка», которая появляется в завершённых неопубликованных играх. В этой вкладке пользователь видит весь текст IC с возможностью инлайн-редактирования и удаления своих постов перед публикацией.

## Стек
- Next.js 16 App Router, TypeScript
- Tailwind CSS 4 + CSS-переменные (`--bg`, `--accent`, `--text`, `--border`, `--text-2`, `--edge`)
- PostgreSQL (raw SQL через `query()` / `queryOne()` / `withTransaction()` из `lib/db.ts`)
- iron-session (cookie `apocryph_session`)
- TipTap (rich editor) — компонент `RichEditor.tsx`
- sanitize-html (через `lib/sanitize.ts`)
- CSS-классы: `.btn-primary`, `.btn-ghost`, `.tiptap-content`, шрифты: `font-heading`, `font-body`, `font-mono`

## Контекст кодовой базы

### Ключевые файлы
- `src/components/GameDialogClient.tsx` — главный компонент игрового диалога
- `src/components/game/TopBar.tsx` — вкладки (IC, OOC, Notes)
- `src/components/game/MessageFeed.tsx` — лента сообщений
- `src/components/game/MessageBubble.tsx` — один пост
- `src/components/game/MsgContent.tsx` — отображение HTML контента поста
- `src/components/RichEditor.tsx` — TipTap редактор (использовать для инлайн-редактирования)
- `src/components/hooks/useGameChat.ts` — хук с логикой чата
- `src/components/hooks/useGameSSE.ts` — SSE события
- `src/app/api/games/[id]/messages/[msgId]/route.ts` — PATCH и DELETE — уже реализованы
- `src/app/api/games/[id]/prepare/route.ts` — POST toggle prepare_for_publish
- `src/i18n/ru.ts`, `src/i18n/en.ts` — переводы
- `src/lib/game-utils.ts` — `paginationRange()`

### Тип Message
```ts
interface Message {
  id: string
  content: string
  type: 'ic' | 'ooc' | 'dice'
  created_at: string
  edited_at: string | null
  user_id: string
  nickname: string
  avatar_url: string | null
  participant_id: string
}
```

### Текущее состояние (требует отката)
**MessageBubble.tsx** — содержит `isSelected`, `onToggleSelect`, `canSelect`, `selectCheckbox` — всё убрать. `isPrePublish` тоже убрать.
**MessageFeed.tsx** — содержит `selectedIds`, `onToggleSelect` — убрать. `isPrePublish` оставить только для диминга.
**GameDialogClient.tsx** — содержит `selectedIds`, `batchConfirm`, `batchDeleting`, `handleBatchDelete`, `handleToggleSelect`, плавающий бар — всё убрать.
**useGameChat.ts** — содержит `batchDeleteMessages` — убрать.

### API — что уже реализовано
**PATCH `/api/games/[id]/messages/[msgId]`**
- Проверяет: свой пост, `published_at IS NULL`, `type != 'dice'`
- Сбрасывает своё согласие на публикацию
- Возвращает: `{ content, edited_at }`

**DELETE `/api/games/[id]/messages/[msgId]`**
- Проверяет: свой пост, `status = 'finished'`, `prepare_for_publish = true` (DB-флаг), `published_at IS NULL`, `type != 'dice'`
- Удаляет пост, сбрасывает согласие, уведомляет через SSE

**POST `/api/games/[id]/prepare`**
- Тогглит `prepare_for_publish` в `game_participants`
- Возвращает: `{ prepare_for_publish: boolean }`

## Требования

### ТАСК #1 — Откат: MessageBubble + MessageFeed + useGameChat
- **MessageBubble.tsx**: убрать пропсы `isPrePublish`, `isSelected`, `onToggleSelect`; убрать `canSelect`, `selectCheckbox`. Сохранить остальное.
- **MessageFeed.tsx**: убрать пропсы `selectedIds`, `onToggleSelect`, `onDeleteMessage`; оставить `isPrePublish`. Диминг: обернуть каждый `MessageBubble` в `<div>` с `opacity: 0.38` если `isPrePublish && msg.user_id !== userId && !isOoc`. `isPrePublish` больше НЕ передавать в MessageBubble.
- **useGameChat.ts**: убрать `batchDeleteMessages` и её экспорт.

### ТАСК #2 — TopBar: вкладка «Правка»
- Расширить тип `activeTab` до `'ic' | 'ooc' | 'notes' | 'prepare'`
- Добавить пропсы: `isFinished: boolean`, `isPublished: boolean`
- Вкладка «Правка» видна когда `isFinished && !isPublished && !isLeft`
- i18n: `game.prepareTab` — «Правка» / «Edit»
- Использовать `tabBtnCls(activeTab === 'prepare', 'prepare')` для стилизации

### ТАСК #3 — PrepareTab.tsx (новый компонент)
**Пропсы:**
```ts
interface PrepareTabProps {
  messages: Message[]
  userId: string
  gameId: string
  currentPage: number
  totalPages: number
  pageLoading: boolean
  fullscreen: boolean
  onGoToPage: (page: number) => void
  onUpdateMessage: (data: { id: string; content: string; edited_at: string }) => void
  onDeleteMessage: (id: string) => void
  onMyConsentReset: () => void
}
```

**Локальный стейт:** `editingId`, `editContent`, `editSaving`, `deleteConfirmId`, `errorMsg`

**Рендер постов:**
- Посты соигрока: `opacity-40`, только текст, без кнопок
- Кубики (type='dice'): без кнопок у обоих
- Свои посты (не dice):
  - Шапка: никнейм `font-heading italic text-ink-2` + дата `font-mono opacity-40` + кнопки справа
  - **Режим редактирования** (`editingId === msg.id`): `RichEditor` + [Сохранить] + [Отмена]
  - **Режим подтверждения удаления** (`deleteConfirmId === msg.id`): инлайн «Удалить безвозвратно?» + [Да] (красный) + [Нет]
  - **Обычный вид**: `MsgContent` + иконка карандаша + иконка корзины

**API-вызовы напрямую в компоненте:**
```ts
// Сохранение
const res = await fetch(`/api/games/${gameId}/messages/${msgId}`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: editContent })
})
if (res.ok) { onUpdateMessage(await res.json()); onMyConsentReset() }
else { const d = await res.json(); setErrorMsg(t(`errors.${d.error}`) as string) }

// Удаление
const res = await fetch(`/api/games/${gameId}/messages/${msgId}`, { method: 'DELETE' })
if (res.ok) { onDeleteMessage(msgId); onMyConsentReset() }
else { const d = await res.json(); setErrorMsg(t(`errors.${d.error}`) as string) }
```

**Лайаут:**
- Контейнер: `flex-1 overflow-y-auto`, padding как в MessageFeed (`fullscreen ? '1.5rem 6rem' : '1.5rem'`)
- Каждый пост: `border-b border-edge py-4`
- Шапка: flex justify-between items-baseline
- Ошибки: `font-mono text-[0.65rem] text-red-500 mt-1`
- Пагинация: переиспользовать `paginationRange` из `@/lib/game-utils`

### ТАСК #4 — GameDialogClient: подключение PrepareTab
- Убрать: `selectedIds`, `batchConfirm`, `batchDeleting`, `handleBatchDelete`, `handleToggleSelect`, плавающий бар
- Расширить тип `activeTab` до `'ic' | 'ooc' | 'notes' | 'prepare'`
- `initialTab` — добавить кейс `=== 'prepare'`
- При `setActiveTab('prepare')`: если `!isPreparing` — вызывать `handleTogglePrepare()`
- `isPrePublish` = `isPreparing` (без изменений)
- Рендер PrepareTab когда `activeTab === 'prepare'` (вместо MessageFeed+MessageEditor)
- Передать в TopBar: `isFinished`, `isPublished={!!game.published_at}`

## Ограничения
- НЕ менять API-эндпоинты
- НЕ использовать `window.confirm` / `window.alert`
- Использовать только существующий `RichEditor` компонент
- НЕ менять `useGameSSE.ts`, `StatusBanners.tsx`, `EpilogueModal.tsx`
- CSS: только существующие классы и переменные; inline style только для динамических значений

## Критерии готовности
1. `npm run build` проходит без ошибок TypeScript
2. В завершённой неопубликованной игре вкладка «Правка» появляется в TopBar
3. Клик по «Правка» → автоматически включается `isPreparing`
4. Посты соигрока в Правке: бледные, без кнопок
5. Редактирование: TipTap инлайн → Сохранить → пост обновляется без перезагрузки + моё согласие сбрасывается
6. Удаление: инлайн подтверждение → Да → пост исчезает + моё согласие сбрасывается
7. IC-вкладка при `isPreparing`: посты соигрока бледнеют; чекбоксов нет
8. Чекбоксы и плавающий бар полностью исчезли

## Таски
ТАСК #1: Откат MessageBubble + MessageFeed + useGameChat
Файлы: MessageBubble.tsx, MessageFeed.tsx, useGameChat.ts
Зависит от: нет

ТАСК #2: TopBar — вкладка «Правка»
Файлы: TopBar.tsx, i18n/ru.ts, i18n/en.ts
Зависит от: нет

ТАСК #3: PrepareTab.tsx — новый компонент
Файлы: PrepareTab.tsx (новый)
Зависит от: нет

ТАСК #4: GameDialogClient — подключение
Файлы: GameDialogClient.tsx
Зависит от: #1, #2, #3
