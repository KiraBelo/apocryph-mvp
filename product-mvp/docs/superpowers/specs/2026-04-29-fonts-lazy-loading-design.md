# Spec: Lazy-loading шрифтов

**Дата:** 2026-04-29
**Автор:** brainstorming session
**Статус:** approved

## Проблема

Сейчас на каждой странице (включая лендинг для неавторизованных) `src/app/layout.tsx` грузит **18 семейств Google Fonts** одним `<link>` — `Cormorant Garamond, EB Garamond, Courier Prime, Lora, Playfair Display, Merriweather, Crimson Pro, Caveat, Raleway, PT Serif, PT Sans, PT Mono, Neucha, Marck Script, Montserrat, Roboto, Open Sans, Nunito` — каждое в 2-8 начертаниях (regular + italic, разные веса).

Это даёт ~600 КБ только на шрифты при первой загрузке, **независимо от того, какие из них реально используются на странице**. Большинство грузится «на всякий случай», потому что юзер _может_ выбрать их в выпадашке настроек или редактора постов.

## Цель

Сократить размер первой загрузки до ~80 КБ (только реально используемые шрифты), сохранив все 18 шрифтов в выборе пользователя без потери функциональности и без визуального «мигания» (FOUC) текста.

## Принципы продукта

Сайт — для письма и чтения. Кастомизация шрифта — это часть ценности продукта (как темы), её нельзя резать. Решение должно сохранить **все 18 опций** в выпадашках.

## Решение

Дифференцированная загрузка по моменту необходимости.

### Что грузится когда

| Момент | Что грузится |
|---|---|
| Любая страница, первый заход | **Дефолтные 2:** Cormorant Garamond + Courier Prime |
| Любая страница, если у юзера сохранён `siteFont` ≠ дефолт | + его шрифт сайта |
| Заход в игру (`/games/[id]`) с пользовательским `gameFont` | + шрифт этой игры |
| Заход в игру или библиотечную игру (`/library/[id]`) | + все шрифты, упомянутые в `font-family` внутри постов |
| Заход в админку на игре в модерации | + все шрифты, упомянутые в постах модерируемой игры |
| Открытие выпадашки шрифтов (RichEditor / SettingsPanel) | + все 16 каталожных шрифтов (одноразово за сессию) |

### Архитектура — три механизма

**Механизм 1: критичные через `next/font/google`** (Cormorant Garamond, Courier Prime)
- Self-hosted на нашем VPS — Next.js скачивает на build, отдаёт с того же origin что и страницу.
- Автоматически: preload + `font-display: swap` + `size-adjust` (zero CLS).
- Заменяет первые 2 строки текущего `<link>` в `layout.tsx`.

**Механизм 2: динамический `<link>` через helper-модуль** `src/lib/font-loader.ts`

```ts
// псевдокод API
loadFont(fontValue: string): void          // одиночный, идемпотентно
loadFonts(fontValues: string[]): void      // батч в один <link>
loadAllCatalogFonts(): void                // все 16 не-критичных, одноразово
extractFontsFromHtml(html: string): string[]  // парсит inline font-family
```

Внутри: создаёт `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...">` с правильными весами/italic, добавляет в `document.head`. Хранит в Set уже загруженные, чтобы не дублировать.

**Механизм 3: FOUC-bootstrap для пользовательского `siteFont`/`gameFont`**

Расширить существующий FOUC-скрипт в `layout.tsx` (тот что читает тему): дополнительно читать `localStorage.getItem('apocryph-site-font')`. Если выбор ≠ дефолта — синхронно вставить `<link>` для этого шрифта **до отрисовки**. Это даёт FOUC-free загрузку при возвращении.

`gameFont` обрабатывается на уровне страницы игры в `useEffect` — там FOUC не критичен, потому что между навигацией и появлением контента игры есть loading-state.

### Точки интеграции

**Изменения файлов:**

| Файл | Что меняется |
|---|---|
| `src/app/layout.tsx` | Удалить `<link>` на 18 шрифтов. Добавить импорт `next/font/google` для Cormorant + Courier Prime. Расширить FOUC-bootstrap чтением `siteFont` из localStorage |
| `src/lib/font-loader.ts` | **Новый файл.** Helper'ы `loadFont`, `loadFonts`, `loadAllCatalogFonts`, `extractFontsFromHtml`, `buildFontLink` |
| `src/lib/fonts.ts` | Добавить metadata: какие веса/italic нужны каждому шрифту (для построения URL) |
| `src/components/RichEditor.tsx` | При первом открытии выпадашки шрифтов → `loadAllCatalogFonts()` |
| `src/components/SettingsPanel.tsx` | При первом открытии выпадашки шрифтов → `loadAllCatalogFonts()`. При изменении `siteFont` → `loadFont(value)` |
| `src/components/SettingsContext.tsx` | При применении `gameFont` ≠ дефолт → `loadFont(value)` |
| `src/components/PublicGameViewer.tsx` | На mount: `extractFontsFromHtml(...) → loadFonts(...)` для всех IC-постов |
| `src/components/GameDialogClient.tsx` | На mount + при появлении новых сообщений (SSE): то же |
| `src/components/AdminReports.tsx` (если показывает посты) | То же |
| `src/app/admin/games/[id]/page.tsx` (если есть превью) | То же |
| `src/app/globals.css` | Без изменений |

### Edge cases

1. **TipTap редактор: юзер пишет с шрифтом, которого нет в каталоге.** Сейчас невозможно — выбор закрыт списком из `FONT_GROUPS`. После изменений — то же.
2. **Юзер сменил `siteFont` → шрифт грузится → но ещё не загружен → текст показан Georgia на ~200мс.** Допустимо, потому что это редкий момент (один клик в настройках). Можно показать toast «применяется...» — опционально, не блокер.
3. **SSE добавляет новый пост со шрифтом, которого ещё нет на странице.** В `useGameSSE` обработчик нового сообщения вызывает `extractFontsFromHtml(message.body) → loadFonts(...)`.
4. **Юзер с медленным интернетом открывает выпадашку → ждёт 1-2 сек → видит превью.** Это запланированный trade-off. Открытие выпадашки — редкое действие.
5. **SSR/CSR mismatch.** Helper'ы вызываются только в `useEffect` (client-only) — никаких SSR-проблем.
6. **`font-display: swap` для динамических `<link>`.** Google Fonts URL уже включает `&display=swap` — сохраняем тот же параметр в `buildFontLink`.

## Тестирование

### Регрессионный тест (защищает само сокращение)
**Файл:** `src/app/__tests__/layout-fonts.test.tsx`
- Рендерит `<RootLayout />`, проверяет что в HTML head **не более 3 `<link>` тегов** на шрифты, и каждый — только Cormorant Garamond или Courier Prime.
- Если кто-то откатит изменения и вернёт 18-шрифтовый `<link>` — тест упадёт.

### Unit-тесты helper'ов
**Файл:** `src/lib/__tests__/font-loader.test.ts`
- `buildFontLink('Lora')` → корректный URL с весами 400/500 + italic.
- `loadFont` идемпотентно: 2 вызова с одним именем → один `<link>` в DOM.
- `loadFonts(['Lora', 'PT Serif'])` → один `<link>` со всеми сразу (батч).
- `extractFontsFromHtml('<p style="font-family: Lora, Georgia, serif">x</p>')` → `['Lora']`. Парсер берёт **первое имя** из CSS-списка `font-family`. Игнорирует, если первое имя в стоп-списке: системные (`Georgia, Times New Roman, Arial, Calibri, Courier New`), generic (`serif, sans-serif, cursive, monospace`), уже self-hosted через `next/font` (`Cormorant Garamond, Courier Prime`). Возвращает только то, что реально нужно подгрузить с Google Fonts.
- `loadAllCatalogFonts` идемпотентно: 2 вызова → один `<link>`.

### Component-тесты
**Файл:** `src/components/__tests__/SettingsPanel.fonts.test.tsx`
- Открытие выпадашки шрифтов → mock `loadAllCatalogFonts` вызван 1 раз.
- Повторное открытие → не вызван снова.
- Выбор шрифта → `loadFont(value)` вызван.

**Файл:** `src/components/__tests__/PublicGameViewer.fonts.test.tsx`
- Рендер с постами, содержащими `font-family: Lora` и `font-family: PT Serif` → `loadFonts(['Lora', 'PT Serif'])` вызван 1 раз на mount.

### E2E (Playwright)
**Файл:** `e2e/fonts-loading.spec.ts`
- Зайти на `/`, проверить через `page.evaluate()` что в head нет ссылки на «family=Lora» или «family=PT+Sans».
- Залогиниться, в настройках выбрать Lora, перезайти → проверить что `<link>` для Lora появился до first paint (через `page.waitForLoadState('domcontentloaded')` + проверка наличия link).

### Ручная проверка после деплоя
- Открыть `/` в Chrome DevTools → Network → проверить что грузится 2-3 шрифта, не 18.
- Зайти в настройки → открыть выпадашку шрифтов → каждое название отрисовано в своём шрифте (после ~500мс на быстром интернете).
- Открыть библиотечную игру с пост-форматированием → проверить что шрифты постов отрисовались правильно.
- Переключение между всеми 4 темами (light/sepia/ink/nocturne) — шрифты остаются.

## Метрики успеха

- Размер первой загрузки шрифтов: было ~600 КБ → стало <100 КБ (Lighthouse audit).
- LCP (Largest Contentful Paint) для главной страницы: ожидаемое улучшение 200-500мс на 3G/4G.
- Все 349+ существующих vitest-тестов проходят.
- Новых тестов: ~15-20.

## Что НЕ делаем (out of scope)

- Не сокращаем список из `FONT_GROUPS` — все 18 остаются.
- Не меняем дизайн, цвета, темы.
- Не переезжаем на иной font hosting (Fontsource, Bunny Fonts) — Google Fonts остаётся источником.
- Не делаем server-side определение `siteFont` через cookie (overkill, FOUC-bootstrap достаточно).
- Не оптимизируем размер каждого отдельного шрифта (subsetting, variable fonts) — это отдельная задача.

## Риски

| Риск | Митигация |
|---|---|
| Шрифты в постах библиотеки не догружаются → текст в Georgia | `extractFontsFromHtml` + регрессионный component-тест |
| FOUC-bootstrap script падает с ошибкой → ломает страницу | Try/catch вокруг чтения localStorage, fallback на дефолтные шрифты |
| Google Fonts API возвращает 4xx на нестандартные имена | `buildFontLink` валидирует имя по белому списку из `FONT_GROUPS` |
| Регрессия CLS из-за динамической вставки `<link>` | `next/font` для критичных даёт `size-adjust`, для динамических ничего не делаем — там CLS приемлем (≠ FCP) |

## Зависимости и порядок имплементации

1. Helper-модуль `font-loader.ts` + unit-тесты (изолированно, без других изменений).
2. `next/font` миграция критичных в `layout.tsx` + регрессионный тест на head.
3. FOUC-bootstrap расширение для `siteFont`.
4. Интеграция в `RichEditor`, `SettingsPanel`, `SettingsContext`.
5. Интеграция в `PublicGameViewer`, `GameDialogClient` + scan постов.
6. Интеграция в админку (если показывает посты).
7. E2E-тест.
8. Ручная проверка + деплой.
