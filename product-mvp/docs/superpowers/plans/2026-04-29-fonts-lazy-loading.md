# Lazy-loading шрифтов — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сократить первую загрузку шрифтов с ~600 КБ до <100 КБ, сохранив все 18 опций в выпадашке.

**Architecture:** Критичные 2 шрифта переезжают на `next/font/google` (self-hosted). Остальные 16 догружаются по требованию через runtime-helper, добавляющий `<link>` в head. Пользовательский `siteFont` грузится через FOUC-bootstrap скрипт до первой отрисовки — без визуального «мигания».

**Tech Stack:** Next.js 16 + `next/font/google`, vitest (server + client projects), Playwright, jsdom для тестов DOM-helper'ов.

**Spec:** [`../specs/2026-04-29-fonts-lazy-loading-design.md`](../specs/2026-04-29-fonts-lazy-loading-design.md)

---

## File Structure

**New files (8):**
- `src/lib/font-loader.ts` — runtime helpers (загрузка шрифтов в DOM)
- `src/lib/font-bootstrap.ts` — генератор inline-скрипта для layout.tsx
- `src/lib/__tests__/font-loader.test.ts` — unit + DOM тесты
- `src/lib/__tests__/font-bootstrap.test.ts` — тесты генератора скрипта
- `src/app/__tests__/layout-fonts.test.tsx` — регрессионный тест на head
- `src/components/__tests__/SettingsPanel.fonts.test.tsx`
- `src/components/__tests__/PublicGameViewer.fonts.test.tsx`
- `e2e/fonts-loading.spec.ts`

**Modified files (8):**
- `src/lib/fonts.ts` — добавить metadata weights/italic к каждому FontOption
- `src/app/layout.tsx` — заменить большой `<link>` на `next/font` + расширить FOUC bootstrap
- `src/app/globals.css` — заменить хардкод `'Cormorant Garamond'`/`'Courier Prime'` на CSS-переменные next/font
- `src/components/SettingsContext.tsx` — вызывать `loadFont` на hydration (если siteFont ≠ default) + при `set('siteFont', ...)`
- `src/components/SettingsPanel.tsx` — вызывать `loadAllCatalogFonts` при первом открытии выпадашки
- `src/components/RichEditor.tsx` — вызывать `loadAllCatalogFonts` при первом открытии выпадашки
- `src/components/PublicGameViewer.tsx` — `extractFontsFromHtml` + `loadFonts` на mount
- `src/components/GameDialogClient.tsx` (или `hooks/useGameSSE.ts`) — то же на mount + при новых SSE-сообщениях

---

## Task 1: Расширить metadata шрифтов в `src/lib/fonts.ts`

Каждый шрифт должен знать свои веса/italic, чтобы строить правильный URL для Google Fonts. Сейчас эта информация захардкожена в одной строке `<link>` в layout.tsx — переносим в структурированный вид.

**Files:**
- Modify: `src/lib/fonts.ts`

- [ ] **Step 1: Расширить тип `FontOption`**

Заменить строки 1-9 на:

```ts
export interface FontOption {
  label: string
  value: string // CSS font-family string
  /** Имя для Google Fonts URL (`Lora`, `Cormorant Garamond`). Null = системный/self-hosted, не грузить. */
  googleName: string | null
  /** Веса для Google Fonts URL, формат: `400;500` или `300;400;500;600`. */
  weights: string
  /** Включать ли italic-версии. */
  italic: boolean
}

export interface FontGroup {
  key: string // i18n key under 'editor' namespace
  fonts: FontOption[]
}
```

- [ ] **Step 2: Заполнить metadata для всех 18 шрифтов**

Веса берём из текущего URL в `layout.tsx:49`. Для системных шрифтов (Georgia, Times New Roman, Arial, Calibri, Courier New) — `googleName: null`.

Заменить блок `FONT_GROUPS` (строки 11-54) на:

```ts
export const FONT_GROUPS: FontGroup[] = [
  {
    key: 'fontSerif',
    fonts: [
      { label: 'Georgia',          value: 'Georgia, serif',                       googleName: null,                   weights: '',                  italic: false },
      { label: 'Times New Roman',  value: 'Times New Roman, Times, serif',        googleName: null,                   weights: '',                  italic: false },
      { label: 'EB Garamond',      value: 'EB Garamond, Georgia, serif',          googleName: 'EB Garamond',          weights: '400;500',           italic: true  },
      { label: 'Cormorant',        value: 'Cormorant Garamond, Georgia, serif',   googleName: null,                   weights: '',                  italic: false },
      { label: 'Lora',             value: 'Lora, Georgia, serif',                 googleName: 'Lora',                 weights: '400;500',           italic: true  },
      { label: 'Playfair Display', value: 'Playfair Display, Georgia, serif',     googleName: 'Playfair Display',     weights: '400;500',           italic: true  },
      { label: 'Merriweather',     value: 'Merriweather, Georgia, serif',         googleName: 'Merriweather',         weights: '300;400',           italic: true  },
      { label: 'Crimson Pro',      value: 'Crimson Pro, Georgia, serif',          googleName: 'Crimson Pro',          weights: '400;500',           italic: true  },
      { label: 'PT Serif',         value: 'PT Serif, Georgia, serif',             googleName: 'PT Serif',             weights: '400;700',           italic: true  },
    ],
  },
  {
    key: 'fontSans',
    fonts: [
      { label: 'Arial',       value: 'Arial, Helvetica, sans-serif',     googleName: null,         weights: '',           italic: false },
      { label: 'Roboto',      value: 'Roboto, Arial, sans-serif',        googleName: 'Roboto',     weights: '300;400;500', italic: true  },
      { label: 'Calibri',     value: 'Calibri, Candara, sans-serif',     googleName: null,         weights: '',           italic: false },
      { label: 'Raleway',     value: 'Raleway, sans-serif',              googleName: 'Raleway',    weights: '300;400',     italic: true  },
      { label: 'Montserrat',  value: 'Montserrat, sans-serif',           googleName: 'Montserrat', weights: '300;400;500', italic: true  },
      { label: 'PT Sans',     value: 'PT Sans, sans-serif',              googleName: 'PT Sans',    weights: '400;700',     italic: true  },
      { label: 'Open Sans',   value: 'Open Sans, Arial, sans-serif',     googleName: 'Open Sans',  weights: '300;400;500', italic: true  },
      { label: 'Nunito',      value: 'Nunito, sans-serif',               googleName: 'Nunito',     weights: '300;400;500', italic: true  },
    ],
  },
  {
    key: 'fontHandwriting',
    fonts: [
      { label: 'Caveat',       value: 'Caveat, cursive',       googleName: 'Caveat',       weights: '400;500', italic: false },
      { label: 'Neucha',       value: 'Neucha, cursive',       googleName: 'Neucha',       weights: '400',     italic: false },
      { label: 'Marck Script', value: 'Marck Script, cursive', googleName: 'Marck Script', weights: '400',     italic: false },
    ],
  },
  {
    key: 'fontMono',
    fonts: [
      { label: 'PT Mono',     value: 'PT Mono, monospace',                  googleName: 'PT Mono', weights: '400', italic: false },
      { label: 'Courier New', value: 'Courier New, Courier, monospace',     googleName: null,      weights: '',    italic: false },
    ],
  },
]
```

Обратить внимание: `Cormorant Garamond` и `Courier Prime` помечены `googleName: null` — они теперь self-hosted через `next/font` (Task 5), их грузить отдельным механизмом не нужно. `Cormorant Garamond` оставлен в списке выбора, потому что юзер всё ещё может его выбрать как siteFont.

Wait — `Courier Prime` отсутствует в списке выбора (`PT Mono` и `Courier New` — только эти два mono). Проверь это в текущем файле и не добавляй Courier Prime если его не было в FONT_GROUPS. Courier Prime используется только как `--mono` через next/font, в выпадашку не выводится.

- [ ] **Step 3: Экспортировать helper-карту по googleName**

В конец файла добавить:

```ts
/** Карта `googleName` → metadata. Для построения Google Fonts URL по имени шрифта. */
export const FONT_METADATA: Record<string, { weights: string; italic: boolean }> = Object.fromEntries(
  ALL_FONTS
    .filter((f): f is FontOption & { googleName: string } => f.googleName !== null)
    .map(f => [f.googleName, { weights: f.weights, italic: f.italic }])
)

/** Список Google-шрифтов, которые надо лениво подгружать (всё кроме системных и self-hosted). */
export const LAZY_GOOGLE_FONTS: string[] = Object.keys(FONT_METADATA)
```

- [ ] **Step 4: Запустить typecheck**

```bash
cd product-mvp && npm run typecheck
```

Expected: PASS (новые поля типизированы корректно)

- [ ] **Step 5: Commit**

```bash
git add src/lib/fonts.ts
git commit -m "refactor(fonts): add weights/italic metadata to FontOption"
```

---

## Task 2: Pure helpers в `src/lib/font-loader.ts`

Чистые функции (без DOM): парсинг CSS, построение URL, извлечение шрифтов из HTML. Тестируются в node-окружении (vitest server project).

**Files:**
- Create: `src/lib/font-loader.ts`
- Create: `src/lib/__tests__/font-loader.test.ts`

- [ ] **Step 1: Написать failing тест**

Создать `src/lib/__tests__/font-loader.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseFirstFontName, buildFontLinkUrl, extractGoogleFontsFromHtml } from '@/lib/font-loader'

describe('parseFirstFontName', () => {
  it('returns first name from CSS list', () => {
    expect(parseFirstFontName('Lora, Georgia, serif')).toBe('Lora')
    expect(parseFirstFontName('"Open Sans", Arial')).toBe('Open Sans')
    expect(parseFirstFontName("'PT Serif', serif")).toBe('PT Serif')
  })

  it('returns null for empty/whitespace input', () => {
    expect(parseFirstFontName('')).toBeNull()
    expect(parseFirstFontName('   ')).toBeNull()
  })

  it('returns the only name when no comma', () => {
    expect(parseFirstFontName('Georgia')).toBe('Georgia')
  })
})

describe('buildFontLinkUrl', () => {
  it('builds URL with weights + italic', () => {
    const url = buildFontLinkUrl([{ name: 'Lora', weights: '400;500', italic: true }])
    expect(url).toBe(
      'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap'
    )
  })

  it('builds URL with weights only (no italic)', () => {
    const url = buildFontLinkUrl([{ name: 'Caveat', weights: '400;500', italic: false }])
    expect(url).toBe(
      'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&display=swap'
    )
  })

  it('builds URL without weights (single 400)', () => {
    const url = buildFontLinkUrl([{ name: 'Neucha', weights: '', italic: false }])
    expect(url).toBe(
      'https://fonts.googleapis.com/css2?family=Neucha&display=swap'
    )
  })

  it('encodes spaces as +', () => {
    const url = buildFontLinkUrl([{ name: 'PT Serif', weights: '400;700', italic: true }])
    expect(url).toContain('family=PT+Serif:ital,wght@')
  })

  it('batches multiple fonts in one URL', () => {
    const url = buildFontLinkUrl([
      { name: 'Lora', weights: '400', italic: false },
      { name: 'Caveat', weights: '400;500', italic: false },
    ])
    expect(url).toBe(
      'https://fonts.googleapis.com/css2?family=Lora&family=Caveat:wght@400;500&display=swap'
    )
  })

  it('returns empty string for empty array', () => {
    expect(buildFontLinkUrl([])).toBe('')
  })
})

describe('extractGoogleFontsFromHtml', () => {
  it('extracts first name from font-family in inline style', () => {
    const html = '<p style="font-family: Lora, Georgia, serif">x</p>'
    expect(extractGoogleFontsFromHtml(html)).toEqual(['Lora'])
  })

  it('extracts multiple unique fonts', () => {
    const html = '<p style="font-family: Lora">x</p><span style="font-family: PT Serif, serif">y</span>'
    expect(extractGoogleFontsFromHtml(html).sort()).toEqual(['Lora', 'PT Serif'])
  })

  it('deduplicates same font', () => {
    const html = '<p style="font-family: Lora">a</p><p style="font-family: Lora">b</p>'
    expect(extractGoogleFontsFromHtml(html)).toEqual(['Lora'])
  })

  it('skips system fonts (Georgia, Arial, etc)', () => {
    const html = '<p style="font-family: Georgia, serif">a</p><p style="font-family: Arial">b</p>'
    expect(extractGoogleFontsFromHtml(html)).toEqual([])
  })

  it('skips generic families (serif, sans-serif, cursive, monospace)', () => {
    const html = '<p style="font-family: serif">a</p><p style="font-family: sans-serif">b</p>'
    expect(extractGoogleFontsFromHtml(html)).toEqual([])
  })

  it('skips self-hosted (Cormorant Garamond, Courier Prime)', () => {
    const html = '<p style="font-family: Cormorant Garamond">a</p><p style="font-family: Courier Prime">b</p>'
    expect(extractGoogleFontsFromHtml(html)).toEqual([])
  })

  it('skips fonts not in the catalog (unknown)', () => {
    const html = '<p style="font-family: Comic Sans MS">a</p>'
    expect(extractGoogleFontsFromHtml(html)).toEqual([])
  })

  it('handles quoted names', () => {
    const html = `<p style='font-family: "Open Sans", Arial'>a</p>`
    expect(extractGoogleFontsFromHtml(html)).toEqual(['Open Sans'])
  })

  it('returns empty array for HTML without font-family', () => {
    expect(extractGoogleFontsFromHtml('<p>plain text</p>')).toEqual([])
    expect(extractGoogleFontsFromHtml('')).toEqual([])
  })
})
```

- [ ] **Step 2: Запустить тест — должен провалиться**

```bash
cd product-mvp && npx vitest run src/lib/__tests__/font-loader.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/font-loader'`

- [ ] **Step 3: Создать `src/lib/font-loader.ts` с pure helpers**

```ts
import { FONT_METADATA } from './fonts'

const SELF_HOSTED = new Set(['Cormorant Garamond', 'Courier Prime'])
const SYSTEM_FONTS = new Set(['Georgia', 'Times New Roman', 'Times', 'Arial', 'Helvetica', 'Calibri', 'Candara', 'Courier New', 'Courier'])
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'cursive', 'monospace', 'system-ui'])

/** Извлекает первое имя шрифта из CSS-строки `font-family`. */
export function parseFirstFontName(cssValue: string): string | null {
  const trimmed = cssValue.trim()
  if (!trimmed) return null
  const first = trimmed.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
  return first || null
}

export interface FontSpec {
  name: string
  weights: string
  italic: boolean
}

/** Строит URL для Google Fonts CSS API v2 с батчем шрифтов. */
export function buildFontLinkUrl(specs: FontSpec[]): string {
  if (specs.length === 0) return ''
  const parts = specs.map(({ name, weights, italic }) => {
    const encodedName = encodeURIComponent(name).replace(/%20/g, '+')
    if (!weights) return `family=${encodedName}`
    if (italic) {
      const ws = weights.split(';').map(w => w.trim()).filter(Boolean)
      const italics = [
        ...ws.map(w => `0,${w}`),
        ...ws.map(w => `1,${w}`),
      ].join(';')
      return `family=${encodedName}:ital,wght@${italics}`
    }
    return `family=${encodedName}:wght@${weights}`
  })
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`
}

/** Сканирует HTML на предмет inline `font-family` и возвращает уникальные имена шрифтов из каталога. */
export function extractGoogleFontsFromHtml(html: string): string[] {
  if (!html) return []
  const result = new Set<string>()
  const matches = html.matchAll(/font-family:\s*([^;"']+(?:["'][^"']+["'])?[^;]*)/gi)
  for (const m of matches) {
    const firstName = parseFirstFontName(m[1])
    if (!firstName) continue
    if (SYSTEM_FONTS.has(firstName)) continue
    if (GENERIC_FAMILIES.has(firstName)) continue
    if (SELF_HOSTED.has(firstName)) continue
    if (!(firstName in FONT_METADATA)) continue // не в каталоге — игнорируем
    result.add(firstName)
  }
  return [...result]
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

```bash
cd product-mvp && npx vitest run src/lib/__tests__/font-loader.test.ts
```

Expected: PASS — все ~16 кейсов зелёные.

- [ ] **Step 5: Commit**

```bash
git add src/lib/font-loader.ts src/lib/__tests__/font-loader.test.ts
git commit -m "feat(font-loader): add pure helpers (parse, buildLinkUrl, extractFromHtml)"
```

---

## Task 3: DOM-helpers в `src/lib/font-loader.ts`

Функции, которые добавляют `<link>` в `document.head`. Идемпотентные, дедупликация через Set.

**Files:**
- Modify: `src/lib/font-loader.ts`
- Modify: `src/lib/__tests__/font-loader.test.ts`

- [ ] **Step 1: Дописать failing тесты для DOM-функций**

Добавить в конец `src/lib/__tests__/font-loader.test.ts`:

```ts
// @vitest-environment jsdom
import { beforeEach } from 'vitest'
import { loadFont, loadFonts, loadAllCatalogFonts, _resetLoadedForTests } from '@/lib/font-loader'

describe('loadFont (DOM)', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    _resetLoadedForTests()
  })

  it('adds <link> for a known font', () => {
    loadFont('Lora')
    const links = document.head.querySelectorAll('link[rel="stylesheet"]')
    expect(links.length).toBe(1)
    expect((links[0] as HTMLLinkElement).href).toContain('family=Lora')
  })

  it('is idempotent — second call does not add another <link>', () => {
    loadFont('Lora')
    loadFont('Lora')
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(1)
  })

  it('accepts CSS-list input and parses first name', () => {
    loadFont('Lora, Georgia, serif')
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(1)
  })

  it('does nothing for system fonts', () => {
    loadFont('Georgia, serif')
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(0)
  })

  it('does nothing for self-hosted fonts', () => {
    loadFont('Cormorant Garamond')
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(0)
  })

  it('does nothing for unknown fonts', () => {
    loadFont('Comic Sans MS')
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(0)
  })
})

describe('loadFonts (DOM batch)', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    _resetLoadedForTests()
  })

  it('adds one <link> for multiple fonts', () => {
    loadFonts(['Lora', 'PT Serif'])
    const links = document.head.querySelectorAll('link[rel="stylesheet"]')
    expect(links.length).toBe(1)
    const href = (links[0] as HTMLLinkElement).href
    expect(href).toContain('family=Lora')
    expect(href).toContain('family=PT+Serif')
  })

  it('skips already-loaded fonts in batch', () => {
    loadFont('Lora')
    loadFonts(['Lora', 'PT Serif']) // Lora already loaded — only PT Serif new
    const links = document.head.querySelectorAll('link[rel="stylesheet"]')
    expect(links.length).toBe(2)
    const newLink = links[1] as HTMLLinkElement
    expect(newLink.href).toContain('family=PT+Serif')
    expect(newLink.href).not.toContain('family=Lora')
  })

  it('does nothing if all fonts already loaded', () => {
    loadFont('Lora')
    loadFonts(['Lora']) // already loaded
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(1)
  })
})

describe('loadAllCatalogFonts (DOM)', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    _resetLoadedForTests()
  })

  it('adds one <link> with all catalog fonts on first call', () => {
    loadAllCatalogFonts()
    const links = document.head.querySelectorAll('link[rel="stylesheet"]')
    expect(links.length).toBe(1)
    expect((links[0] as HTMLLinkElement).href).toContain('family=Lora')
    expect((links[0] as HTMLLinkElement).href).toContain('family=Caveat')
  })

  it('is idempotent across calls', () => {
    loadAllCatalogFonts()
    loadAllCatalogFonts()
    loadAllCatalogFonts()
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(1)
  })
})
```

- [ ] **Step 2: Запустить — должен провалиться**

```bash
cd product-mvp && npx vitest run src/lib/__tests__/font-loader.test.ts
```

Expected: FAIL — `loadFont`, `loadFonts`, `loadAllCatalogFonts`, `_resetLoadedForTests` не экспортированы.

- [ ] **Step 3: Дописать DOM-функции в `src/lib/font-loader.ts`**

В конец файла добавить:

```ts
import { LAZY_GOOGLE_FONTS } from './fonts'

const _loaded = new Set<string>()
let _allCatalogLoaded = false

/** Только для тестов: сбрасывает кэш загруженных шрифтов. */
export function _resetLoadedForTests(): void {
  _loaded.clear()
  _allCatalogLoaded = false
}

function appendLink(url: string): void {
  if (typeof document === 'undefined') return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

function toSpec(googleName: string): FontSpec | null {
  const meta = FONT_METADATA[googleName]
  if (!meta) return null
  return { name: googleName, weights: meta.weights, italic: meta.italic }
}

/** Грузит один Google-шрифт. Принимает либо имя (`'Lora'`), либо CSS-список (`'Lora, serif'`). Идемпотентно. */
export function loadFont(input: string): void {
  const name = parseFirstFontName(input)
  if (!name) return
  if (_loaded.has(name)) return
  const spec = toSpec(name)
  if (!spec) return // системный/self-hosted/неизвестный
  appendLink(buildFontLinkUrl([spec]))
  _loaded.add(name)
}

/** Грузит несколько шрифтов одним `<link>`. Пропускает уже загруженные. */
export function loadFonts(inputs: string[]): void {
  const specs: FontSpec[] = []
  for (const input of inputs) {
    const name = parseFirstFontName(input)
    if (!name) continue
    if (_loaded.has(name)) continue
    const spec = toSpec(name)
    if (!spec) continue
    specs.push(spec)
    _loaded.add(name)
  }
  if (specs.length === 0) return
  appendLink(buildFontLinkUrl(specs))
}

/** Грузит весь каталог не-критичных шрифтов одним `<link>`. Одноразово за сессию. */
export function loadAllCatalogFonts(): void {
  if (_allCatalogLoaded) return
  const remaining = LAZY_GOOGLE_FONTS.filter(n => !_loaded.has(n))
  if (remaining.length > 0) {
    const specs = remaining.map(toSpec).filter((s): s is FontSpec => s !== null)
    appendLink(buildFontLinkUrl(specs))
    for (const s of specs) _loaded.add(s.name)
  }
  _allCatalogLoaded = true
}
```

Также убрать дублирующий импорт `FONT_METADATA` сверху, если он есть, и оставить один общий `import { FONT_METADATA, LAZY_GOOGLE_FONTS } from './fonts'`.

- [ ] **Step 4: Настроить vitest для смешанного env**

Pure-тесты выполняются в node, DOM-тесты в jsdom. Тест-файл уже использует `// @vitest-environment jsdom` per-suite — проверить что vitest config поддерживает per-test env override.

```bash
cd product-mvp && cat vitest.config.ts
```

Если в client project поддерживается environment override через комментарий — оставить как есть. Если нет — разделить тест-файл на два: `font-loader.pure.test.ts` (server project) и `font-loader.dom.test.ts` (client project).

**Если разделили на два файла:** обновить тест-файлы соответственно, и заменить `// @vitest-environment jsdom` на размещение dom-тестов в отдельном файле.

- [ ] **Step 5: Запустить тесты — все должны пройти**

```bash
cd product-mvp && npx vitest run src/lib/__tests__/font-loader
```

Expected: PASS — все кейсы (pure + DOM) зелёные.

- [ ] **Step 6: Commit**

```bash
git add src/lib/font-loader.ts src/lib/__tests__/
git commit -m "feat(font-loader): add DOM helpers (loadFont, loadFonts, loadAllCatalogFonts)"
```

---

## Task 4: Bootstrap-скрипт для FOUC-free загрузки siteFont

Inline-скрипт в `<head>`, который читает `localStorage.apocryph-site-font` и **синхронно** добавляет `<link>` до первой отрисовки. Генератор скрипта — отдельный модуль, чтобы можно было unit-тестировать.

**Files:**
- Create: `src/lib/font-bootstrap.ts`
- Create: `src/lib/__tests__/font-bootstrap.test.ts`

- [ ] **Step 1: Написать failing тест**

`src/lib/__tests__/font-bootstrap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildFontsBootstrapScript } from '@/lib/font-bootstrap'

describe('buildFontsBootstrapScript', () => {
  it('returns a string containing IIFE wrapper', () => {
    const script = buildFontsBootstrapScript()
    expect(script).toMatch(/^\s*\(function\(\)/)
    expect(script).toMatch(/\}\)\(\);?\s*$/)
  })

  it('reads from localStorage key "apocryph-site-font"', () => {
    expect(buildFontsBootstrapScript()).toContain("'apocryph-site-font'")
  })

  it('serializes FONT_METADATA into script', () => {
    const script = buildFontsBootstrapScript()
    // Должен содержать metadata for Lora (как пример)
    expect(script).toContain('"Lora"')
    expect(script).toContain('400;500')
  })

  it('does not throw when executed in jsdom with no localStorage value', () => {
    // @vitest-environment jsdom
    document.head.innerHTML = ''
    const script = buildFontsBootstrapScript()
    // eslint-disable-next-line no-new-func -- intentional eval of generated bootstrap for testing
    new Function(script)()
    expect(document.head.querySelectorAll('link').length).toBe(0)
  })

  it('adds <link> when localStorage has Lora', () => {
    document.head.innerHTML = ''
    localStorage.setItem('apocryph-site-font', 'Lora, Georgia, serif')
    const script = buildFontsBootstrapScript()
    // eslint-disable-next-line no-new-func -- intentional eval of generated bootstrap for testing
    new Function(script)()
    const links = document.head.querySelectorAll('link[rel="stylesheet"]')
    expect(links.length).toBe(1)
    expect((links[0] as HTMLLinkElement).href).toContain('family=Lora')
    localStorage.clear()
  })

  it('does not add <link> for default Georgia', () => {
    document.head.innerHTML = ''
    localStorage.setItem('apocryph-site-font', 'Georgia, serif')
    const script = buildFontsBootstrapScript()
    // eslint-disable-next-line no-new-func -- intentional eval of generated bootstrap for testing
    new Function(script)()
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(0)
    localStorage.clear()
  })

  it('does not add <link> for unknown font', () => {
    document.head.innerHTML = ''
    localStorage.setItem('apocryph-site-font', 'Comic Sans MS')
    const script = buildFontsBootstrapScript()
    // eslint-disable-next-line no-new-func -- intentional eval of generated bootstrap for testing
    new Function(script)()
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(0)
    localStorage.clear()
  })
})
```

Файл должен использовать jsdom для DOM-кейсов. Если vitest config требует — либо переименовать в `font-bootstrap.dom.test.ts` для client project, либо оставить директиву `// @vitest-environment jsdom` в начале файла.

- [ ] **Step 2: Запустить — провалится**

```bash
cd product-mvp && npx vitest run src/lib/__tests__/font-bootstrap.test.ts
```

Expected: FAIL — модуль не существует.

- [ ] **Step 3: Реализовать `src/lib/font-bootstrap.ts`**

```ts
import { FONT_METADATA } from './fonts'

/**
 * Возвращает inline JS-скрипт для `<script dangerouslySetInnerHTML>` в layout.tsx.
 * Скрипт выполняется синхронно до первой отрисовки и, если у юзера сохранён
 * non-default `siteFont`, вставляет соответствующий <link> в <head>.
 *
 * Это устраняет FOUC: при возвращении пользователя его выбранный шрифт
 * уже загружается параллельно с загрузкой страницы.
 */
export function buildFontsBootstrapScript(): string {
  const metadataJson = JSON.stringify(FONT_METADATA)
  return `
(function(){try{
  var META = ${metadataJson};
  var raw = localStorage.getItem('apocryph-site-font');
  if (!raw || raw === 'Georgia, serif') return;
  var first = raw.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  if (!first) return;
  var meta = META[first];
  if (!meta) return;
  var enc = encodeURIComponent(first).replace(/%20/g, '+');
  var url;
  if (!meta.weights) {
    url = 'https://fonts.googleapis.com/css2?family=' + enc + '&display=swap';
  } else if (meta.italic) {
    var ws = meta.weights.split(';');
    var pairs = [];
    for (var i = 0; i < ws.length; i++) pairs.push('0,' + ws[i]);
    for (var j = 0; j < ws.length; j++) pairs.push('1,' + ws[j]);
    url = 'https://fonts.googleapis.com/css2?family=' + enc + ':ital,wght@' + pairs.join(';') + '&display=swap';
  } else {
    url = 'https://fonts.googleapis.com/css2?family=' + enc + ':wght@' + meta.weights + '&display=swap';
  }
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
  document.documentElement.style.setProperty('--site-font', raw);
  document.documentElement.style.setProperty('--serif-body', raw);
  document.documentElement.style.setProperty('--game-font', raw);
}catch(e){}})();
`.trim()
}
```

- [ ] **Step 4: Запустить — должны пройти все 7 кейсов**

```bash
cd product-mvp && npx vitest run src/lib/__tests__/font-bootstrap.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/font-bootstrap.ts src/lib/__tests__/font-bootstrap.test.ts
git commit -m "feat(font-bootstrap): inline FOUC script for siteFont preload"
```

---

## Task 5: Миграция критичных шрифтов на `next/font/google` + правка `globals.css`

Self-hosting через Next.js. Cormorant Garamond и Courier Prime будут отдаваться с того же домена что и страница, с автоматическим preload и `font-display: swap`.

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Добавить импорты `next/font/google` в `layout.tsx`**

В начало `src/app/layout.tsx` (после `import type { Metadata }`) добавить:

```ts
import { Cormorant_Garamond, Courier_Prime } from 'next/font/google'

const cormorantGaramond = Cormorant_Garamond({
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-courier-prime',
  display: 'swap',
})
```

- [ ] **Step 2: Применить `.variable` к `<html>` и убрать старый `<link>`**

В JSX заменить:

```tsx
<html lang="ru" data-theme="light" suppressHydrationWarning>
  <head>
    <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:..." rel="stylesheet" />
  </head>
```

на:

```tsx
<html
  lang="ru"
  data-theme="light"
  suppressHydrationWarning
  className={`${cormorantGaramond.variable} ${courierPrime.variable}`}
>
  <head>
    <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
  </head>
```

Удалить три строки: оба `<link rel="preconnect">` и большой `<link>` со списком 18 шрифтов.

- [ ] **Step 3: Обновить `globals.css` — указать на CSS-переменные next/font**

Найти в `src/app/globals.css` блок `:root` (около строки 931) и заменить:

```css
--serif:      'Cormorant Garamond', Georgia, serif;
--site-font:  Georgia, serif;
--serif-body: var(--site-font);
--mono:       'Courier Prime', 'Courier New', monospace;
```

на:

```css
--serif:      var(--font-cormorant), Georgia, serif;
--site-font:  Georgia, serif;
--serif-body: var(--site-font);
--mono:       var(--font-courier-prime), 'Courier New', monospace;
```

- [ ] **Step 4: Запустить build и dev — проверить что шрифты грузятся**

```bash
cd product-mvp && npm run build
```

Expected: build PASS, в выводе видны строки `info  - Loaded font: Cormorant Garamond` и `Courier Prime`.

```bash
npm run dev
```

Открыть http://localhost:3000 в браузере, в DevTools → Network → отфильтровать `font` — должны быть 2 шрифта с того же origin (`/_next/static/media/...`), НЕ `fonts.googleapis.com`.

Визуально: заголовки страниц всё ещё в Cormorant Garamond, бейджи в Courier Prime. Если поломалось — debug.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "perf(fonts): self-host critical fonts via next/font, drop 18-font preload"
```

---

## Task 6: Регрессионный тест на `layout.tsx` — head не содержит ленивых шрифтов

Тест защищает от регрессии: если кто-то откатит миграцию и снова добавит большой `<link>` со всеми 18 шрифтами — тест упадёт.

**Files:**
- Create: `src/app/__tests__/layout-fonts.test.tsx`

- [ ] **Step 1: Написать failing тест**

`src/app/__tests__/layout-fonts.test.tsx`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'

// Замокать серверные зависимости layout
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-nonce': 'test-nonce' }),
}))
vi.mock('@/lib/session', () => ({ getUser: async () => null }))
vi.mock('@/lib/db', () => ({ queryOne: async () => null }))

// Замокать клиентские провайдеры — они не должны грузить шрифты
vi.mock('@/components/SettingsContext', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/components/ToastProvider', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/components/Nav', () => ({ default: () => null }))
vi.mock('@/components/SettingsPanel', () => ({ default: () => null }))
vi.mock('@/components/BanBanner', () => ({ default: () => null }))

describe('RootLayout — fonts loading', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does NOT include the legacy 18-font Google Fonts <link>', async () => {
    const RootLayout = (await import('@/app/layout')).default
    const html = renderToString(await RootLayout({ children: null }))
    // Старый <link> содержал такие имена — если хоть одно есть в head без посредничества next/font, регрессия
    expect(html).not.toMatch(/fonts\.googleapis\.com.*Lora/)
    expect(html).not.toMatch(/fonts\.googleapis\.com.*Playfair/)
    expect(html).not.toMatch(/fonts\.googleapis\.com.*PT\+Serif/)
    expect(html).not.toMatch(/fonts\.googleapis\.com.*Caveat/)
  })

  it('does include FOUC bootstrap script for siteFont', async () => {
    const RootLayout = (await import('@/app/layout')).default
    const html = renderToString(await RootLayout({ children: null }))
    expect(html).toContain("'apocryph-site-font'")
  })
})
```

- [ ] **Step 2: Запустить — может упасть на первом кейсе если Task 5 не доделан, или должен пройти**

```bash
cd product-mvp && npx vitest run src/app/__tests__/layout-fonts.test.tsx
```

Expected: первый кейс PASS (старый link удалён в Task 5), второй FAIL (FOUC bootstrap для siteFont ещё не добавлен — это в Task 7 ниже).

Если оба провалились — проверить что Task 5 завершён корректно.

- [ ] **Step 3: Commit (даже если 1 тест зелёный)**

```bash
git add src/app/__tests__/layout-fonts.test.tsx
git commit -m "test(layout): regression — head must not contain legacy 18-font link"
```

---

## Task 7: Расширить FOUC-bootstrap в `layout.tsx` для siteFont

Подключаем `buildFontsBootstrapScript()` рядом с существующим theme-bootstrap.

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Импортировать генератор**

В `src/app/layout.tsx` после остальных импортов добавить:

```ts
import { buildFontsBootstrapScript } from '@/lib/font-bootstrap'
```

- [ ] **Step 2: Сгенерировать скрипт и добавить второй `<script>` в head**

Перед `return` в `RootLayout` после строки `const themeBootstrap = ...` добавить:

```ts
const fontsBootstrap = buildFontsBootstrapScript()
```

Затем в JSX, в `<head>`, ПОСЛЕ существующего `<script>` с `themeBootstrap` добавить второй:

```tsx
<script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
<script nonce={nonce} dangerouslySetInnerHTML={{ __html: fontsBootstrap }} />
```

- [ ] **Step 3: Запустить регрессионный тест из Task 6 — должны пройти оба кейса**

```bash
cd product-mvp && npx vitest run src/app/__tests__/layout-fonts.test.tsx
```

Expected: PASS (оба кейса).

- [ ] **Step 4: Ручная проверка в браузере**

В DevTools → Console:
```js
localStorage.setItem('apocryph-site-font', 'Lora, Georgia, serif')
location.reload()
```

В Network отфильтровать `font` → должна появиться загрузка Lora с `fonts.googleapis.com`. В Elements → `<head>` → виден `<link>` для Lora.

Затем:
```js
localStorage.removeItem('apocryph-site-font')
location.reload()
```

Должны грузиться только 2 шрифта next/font.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(layout): wire FOUC bootstrap for siteFont preload"
```

---

## Task 8: Интеграция в `SettingsContext` — догрузка siteFont после hydration + при смене

При hydration уже есть FOUC-скрипт, но он грузит только regular weights. После hydration догружаем полный набор (на случай если bootstrap взял сокращённую версию, или если кто-то менял `localStorage` без перезагрузки). При `set('siteFont', new)` грузим новый шрифт перед применением CSS-переменной.

**Files:**
- Modify: `src/components/SettingsContext.tsx`

- [ ] **Step 1: Найти `useEffect` mount-only hydration и `set` функцию**

Mount-only hydration — строки 124-153 (заканчивается `}, [])`).
`set` функция — строки 155-159.

- [ ] **Step 2: Добавить вызов `loadFont` в hydration и в `set`**

Добавить импорт сверху файла (после остальных):

```ts
import { loadFont } from '@/lib/font-loader'
```

В `useEffect` (после `applyAllToDOM(loaded)`) добавить:

```ts
// Догрузить полный набор весов для пользовательского siteFont
// (FOUC-bootstrap в layout.tsx грузит шрифт частично, не все веса/italic)
if (loaded.siteFont !== DEFAULTS.siteFont) {
  loadFont(loaded.siteFont)
}
// gameFont (3 фиксированных значения) уже загружен через критичные next/font
```

Изменить функцию `set` так:

```ts
function set<K extends keyof Settings>(key: K, value: Settings[K]) {
  if (key === 'siteFont') {
    loadFont(value as string)
  }
  localStorage.setItem(KEYS[key], String(value))
  applyOne(key, value)
  setSettings(prev => ({ ...prev, [key]: value }))
}
```

- [ ] **Step 3: Запустить unit-тесты для font-loader (sanity check)**

```bash
cd product-mvp && npx vitest run src/lib/__tests__/
```

Expected: PASS — нет регрессий.

- [ ] **Step 4: Ручная проверка**

В браузере (dev-сервер запущен):
1. Открыть Settings → выбрать «PT Serif» как шрифт сайта.
2. В DevTools → Network → должна появиться загрузка PT Serif.
3. Открыть Settings → переключить обратно на Georgia → новой загрузки нет (системный).
4. Перезагрузить страницу с PT Serif в localStorage → шрифт уже в head на первой отрисовке.

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsContext.tsx
git commit -m "feat(settings): lazy-load siteFont via font-loader on hydration + change"
```

---

## Task 9: Интеграция в `SettingsPanel` — `loadAllCatalogFonts` при первом открытии выпадашки

**Files:**
- Modify: `src/components/SettingsPanel.tsx`
- Create: `src/components/__tests__/SettingsPanel.fonts.test.tsx`

- [ ] **Step 1: Прочитать текущий код выпадашки шрифтов в SettingsPanel**

```bash
cd product-mvp && grep -n "FONT_GROUPS\|fontDropdown\|siteFont" src/components/SettingsPanel.tsx
```

Найти кнопку, которая раскрывает выпадашку шрифтов (около строки 246-250 по результатам предыдущего grep). Вероятно, есть state `fontDropdownOpen` или похожий.

- [ ] **Step 2: Написать failing component-test**

`src/components/__tests__/SettingsPanel.fonts.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsProvider } from '@/components/SettingsContext'
import SettingsPanel from '@/components/SettingsPanel'

vi.mock('@/lib/font-loader', () => ({
  loadFont: vi.fn(),
  loadAllCatalogFonts: vi.fn(),
}))

import { loadAllCatalogFonts, loadFont } from '@/lib/font-loader'

describe('SettingsPanel — fonts dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('loads all catalog fonts on first dropdown open', async () => {
    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>
    )
    // Открыть панель настроек (триггер зависит от текущего UI — например, кнопка с aria-label "settings")
    fireEvent.click(screen.getByRole('button', { name: /настройки|settings/i }))

    // Найти кнопку открытия font dropdown — селектор подобрать по факту
    const fontTrigger = await screen.findByRole('button', { name: /шрифт сайта|site font/i })
    fireEvent.click(fontTrigger)

    expect(loadAllCatalogFonts).toHaveBeenCalledTimes(1)
  })

  it('does not call loadAllCatalogFonts twice on second open', async () => {
    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /настройки|settings/i }))
    const fontTrigger = await screen.findByRole('button', { name: /шрифт сайта|site font/i })
    fireEvent.click(fontTrigger)
    fireEvent.click(fontTrigger) // close
    fireEvent.click(fontTrigger) // open again

    // Должно быть строго 1 раз — внутренняя дедупликация
    expect(loadAllCatalogFonts).toHaveBeenCalledTimes(1)
  })
})
```

Селекторы (`/настройки/i`, `/шрифт сайта/i`) подобрать по факту — открыть `SettingsPanel.tsx` и взять реальные имена кнопок/aria-label'ов. Если кнопок открытия выпадашки нет (например, это `<select>` или хитрый dropdown) — адаптировать.

- [ ] **Step 3: Запустить тест — провалится**

```bash
cd product-mvp && npx vitest run src/components/__tests__/SettingsPanel.fonts.test.tsx
```

Expected: FAIL — `loadAllCatalogFonts` не вызывается.

- [ ] **Step 4: Добавить вызов в `SettingsPanel.tsx`**

Найти state, который управляет открытием font-dropdown (в районе строк 245-260). Добавить импорт сверху:

```ts
import { loadAllCatalogFonts } from '@/lib/font-loader'
```

В обработчик клика по кнопке открытия выпадашки шрифтов (или в `useEffect` с deps `[fontDropdownOpen]`) добавить:

```tsx
const handleFontDropdownToggle = () => {
  if (!fontDropdownOpen) {
    loadAllCatalogFonts()
  }
  setFontDropdownOpen(!fontDropdownOpen)
}
```

(Названия `fontDropdownOpen`/`setFontDropdownOpen` — заменить на реальные.)

- [ ] **Step 5: Запустить тест — должен пройти**

```bash
cd product-mvp && npx vitest run src/components/__tests__/SettingsPanel.fonts.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/SettingsPanel.tsx src/components/__tests__/SettingsPanel.fonts.test.tsx
git commit -m "feat(settings-panel): lazy-load all catalog fonts on dropdown first open"
```

---

## Task 10: Интеграция в `RichEditor` — `loadAllCatalogFonts` при первом открытии font-выпадашки

То же самое для редактора постов.

**Files:**
- Modify: `src/components/RichEditor.tsx`

- [ ] **Step 1: Прочитать текущий код выпадашки шрифтов**

В `RichEditor.tsx:332-346` — кнопка-триггер и список. Найти state открытия (вероятно `showFontMenu` или похожий).

- [ ] **Step 2: Добавить импорт + вызов**

Сверху файла:

```ts
import { loadAllCatalogFonts } from '@/lib/font-loader'
```

Найти обработчик клика по кнопке выпадашки. Заменить:

```tsx
onClick={() => setShowFontMenu(prev => !prev)}
```

на:

```tsx
onClick={() => {
  setShowFontMenu(prev => {
    if (!prev) loadAllCatalogFonts()
    return !prev
  })
}}
```

(Названия — реальные из RichEditor.tsx.)

- [ ] **Step 3: Ручная проверка**

В браузере: открыть страницу с RichEditor (напр. `/requests/new`). В DevTools → Network → отфильтровать `font`. Открыть выпадашку шрифтов в редакторе — должна появиться одна загрузка `fonts.googleapis.com/css2?family=Lora&...&family=Caveat&...` (батч всех 16). Каждое название в выпадашке постепенно отрисуется в своём шрифте.

Закрыть и снова открыть выпадашку — новых загрузок быть не должно.

- [ ] **Step 4: Commit**

```bash
git add src/components/RichEditor.tsx
git commit -m "feat(rich-editor): lazy-load catalog fonts on font-dropdown first open"
```

---

## Task 11: Интеграция в `PublicGameViewer` — сканировать посты и грузить найденные шрифты

При просмотре игры в библиотеке посты могут содержать `font-family: Lora` и т.п. — нужно подгрузить.

**Files:**
- Modify: `src/components/PublicGameViewer.tsx`
- Create: `src/components/__tests__/PublicGameViewer.fonts.test.tsx`

- [ ] **Step 1: Понять структуру компонента**

```bash
cd product-mvp && grep -n "messages\|posts\|body\|html" src/components/PublicGameViewer.tsx | head -20
```

Понять, где компонент получает HTML постов (вероятно в props или через fetch).

- [ ] **Step 2: Написать failing component-test**

`src/components/__tests__/PublicGameViewer.fonts.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import PublicGameViewer from '@/components/PublicGameViewer'

vi.mock('@/lib/font-loader', () => ({
  loadFonts: vi.fn(),
  loadFont: vi.fn(),
}))

import { loadFonts } from '@/lib/font-loader'

describe('PublicGameViewer — fonts in posts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads fonts referenced by posts on mount', () => {
    // Структура props зависит от реальной сигнатуры — подобрать по факту
    const game = {
      id: 'g1',
      title: 'Test',
      messages: [
        { id: 'm1', body_html: '<p style="font-family: Lora, serif">hi</p>', type: 'ic' },
        { id: 'm2', body_html: '<p style="font-family: PT Serif">there</p>', type: 'ic' },
      ],
      // ... остальные обязательные поля
    }
    render(<PublicGameViewer game={game as any} />)
    expect(loadFonts).toHaveBeenCalledTimes(1)
    const arg = (loadFonts as any).mock.calls[0][0] as string[]
    expect(arg.sort()).toEqual(['Lora', 'PT Serif'])
  })

  it('does not call loadFonts when posts have no custom fonts', () => {
    const game = {
      id: 'g1',
      title: 'Test',
      messages: [
        { id: 'm1', body_html: '<p>plain</p>', type: 'ic' },
      ],
    }
    render(<PublicGameViewer game={game as any} />)
    // loadFonts может быть вызван с пустым массивом — это ок, главное чтоб не упало
    if ((loadFonts as any).mock.calls.length > 0) {
      expect((loadFonts as any).mock.calls[0][0]).toEqual([])
    }
  })
})
```

Структура `game` подобрать под реальный `PublicGameViewerProps`.

- [ ] **Step 3: Запустить — провалится**

```bash
cd product-mvp && npx vitest run src/components/__tests__/PublicGameViewer.fonts.test.tsx
```

Expected: FAIL.

- [ ] **Step 4: Реализовать сканирование**

В `src/components/PublicGameViewer.tsx`:

Импорт сверху:
```ts
import { useEffect } from 'react' // если ещё нет
import { loadFonts, extractGoogleFontsFromHtml } from '@/lib/font-loader'
```

Внутри компонента (после получения списка постов):

```tsx
useEffect(() => {
  if (!game?.messages) return
  const allFonts = new Set<string>()
  for (const m of game.messages) {
    const html = m.body_html ?? m.body ?? ''
    for (const f of extractGoogleFontsFromHtml(html)) allFonts.add(f)
  }
  loadFonts([...allFonts])
}, [game?.messages])
```

Названия полей (`body_html`, `body`) — взять реальные из структуры данных.

- [ ] **Step 5: Запустить тест — должен пройти**

```bash
cd product-mvp && npx vitest run src/components/__tests__/PublicGameViewer.fonts.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/PublicGameViewer.tsx src/components/__tests__/PublicGameViewer.fonts.test.tsx
git commit -m "feat(library): scan posts and lazy-load referenced fonts on mount"
```

---

## Task 12: Интеграция в `GameDialogClient` + SSE-обработчик для новых сообщений

Активная игра — то же сканирование на mount + при каждом новом сообщении из SSE.

**Files:**
- Modify: `src/components/GameDialogClient.tsx`
- Modify: `src/components/hooks/useGameChat.ts` (или аналогичный, где обрабатывается новое сообщение)

- [ ] **Step 1: Понять, где обрабатываются initial-messages и SSE-новые**

```bash
cd product-mvp && grep -n "messages\|setMessages\|onMessage" src/components/GameDialogClient.tsx src/components/hooks/useGameChat.ts | head -30
```

Найти:
- Где `messages` инициализируются (из props или fetch на mount).
- Где SSE-handler добавляет новое сообщение в state.

- [ ] **Step 2: Добавить scan на mount в GameDialogClient**

После получения списка сообщений (в `useEffect` или в обработчике fetch):

Импорт сверху:
```ts
import { loadFonts, extractGoogleFontsFromHtml } from '@/lib/font-loader'
```

Где-то в `useEffect` после установки messages:

```tsx
useEffect(() => {
  if (!messages?.length) return
  const fonts = new Set<string>()
  for (const m of messages) {
    for (const f of extractGoogleFontsFromHtml(m.body_html ?? '')) fonts.add(f)
  }
  if (fonts.size > 0) loadFonts([...fonts])
}, [messages])
```

- [ ] **Step 3: Добавить scan в SSE-обработчик**

В `useGameChat.ts` (или где обрабатывается `event.type === 'message'`/'new_message'), при добавлении нового сообщения:

```ts
// После setMessages(prev => [...prev, newMessage])
const fontsInNew = extractGoogleFontsFromHtml(newMessage.body_html ?? '')
if (fontsInNew.length > 0) loadFonts(fontsInNew)
```

Импорт сверху:
```ts
import { loadFonts, extractGoogleFontsFromHtml } from '@/lib/font-loader'
```

- [ ] **Step 4: Ручная проверка**

1. Открыть игру где есть пост с пользовательским шрифтом (можно создать через RichEditor: выделить кусок, выбрать Lora).
2. Очистить localStorage, обновить страницу.
3. В Network: при заходе на `/games/[id]` должна появиться загрузка Lora.
4. Создать новый пост с PT Serif → второй пользователь видит обновление через SSE → проверить что PT Serif подгрузился.

- [ ] **Step 5: Commit**

```bash
git add src/components/GameDialogClient.tsx src/components/hooks/useGameChat.ts
git commit -m "feat(game): scan posts and lazy-load fonts on mount + SSE new message"
```

---

## Task 13: E2E-тест на сценарий «выбрал Lora → перезашёл → видит без мигания»

**Files:**
- Create: `e2e/fonts-loading.spec.ts`

- [ ] **Step 1: Написать E2E-тест**

`e2e/fonts-loading.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

test.describe('fonts: lazy loading', () => {
  test('initial page load does not include legacy 18-font Google Fonts link', async ({ page }) => {
    await page.goto('/')
    const links = await page.locator('link[rel="stylesheet"][href*="fonts.googleapis.com"]').all()
    for (const link of links) {
      const href = await link.getAttribute('href')
      expect(href, 'Initial page load must not contain Lora/PT+Serif/Playfair link').not.toMatch(
        /Lora|PT\+Serif|Playfair|Merriweather|Crimson|Caveat|Raleway|PT\+Sans|Roboto|Open\+Sans|Nunito|Montserrat|Neucha|Marck/
      )
    }
  })

  test('user with siteFont=Lora gets it loaded on first paint (no flash)', async ({ page }) => {
    // Set localStorage before any page nav
    await page.addInitScript(() => {
      localStorage.setItem('apocryph-site-font', 'Lora, Georgia, serif')
    })
    await page.goto('/')
    // Сразу после DOMContentLoaded должен быть link для Lora — добавлен FOUC-bootstrap скриптом
    const loraLink = page.locator('link[rel="stylesheet"][href*="family=Lora"]')
    await expect(loraLink).toHaveCount(1)
  })

  test('opening font dropdown in settings triggers catalog load', async ({ page }) => {
    await loginAs(page, 'luna')
    await page.goto('/')
    // Открыть SettingsPanel — селекторы зависят от UI
    await page.getByRole('button', { name: /настройки/i }).click()
    // Открыть font dropdown
    await page.getByRole('button', { name: /шрифт сайта/i }).click()
    // Должна появиться загрузка батча
    const catalogLink = page.locator('link[rel="stylesheet"][href*="family=Lora"][href*="family=Playfair"]')
    await expect(catalogLink).toHaveCount(1, { timeout: 3000 })
  })
})
```

Селекторы для UI-элементов SettingsPanel (`/настройки/i`, `/шрифт сайта/i`) — заменить на реальные.

- [ ] **Step 2: Запустить E2E**

```bash
cd product-mvp && npx playwright test e2e/fonts-loading.spec.ts
```

Expected: PASS (3 теста).

Если упало на третьем тесте из-за селекторов SettingsPanel — поправить под реальный UI.

- [ ] **Step 3: Commit**

```bash
git add e2e/fonts-loading.spec.ts
git commit -m "test(e2e): fonts lazy loading — initial load, FOUC-free, dropdown trigger"
```

---

## Task 14: Финальная проверка + ручной чеклист + деплой

- [ ] **Step 1: Полный прогон CI локально**

```bash
cd product-mvp && npm run lint && npm run typecheck && npm run test && npm run build
```

Expected: всё PASS, без warning.

- [ ] **Step 2: Запустить E2E полностью**

```bash
cd product-mvp && npm run test:e2e
```

Expected: PASS — никаких регрессий по существующим E2E.

- [ ] **Step 3: Ручной чеклист в dev-сервере во всех 4 темах**

Для каждой темы (`light`, `sepia`, `ink`, `nocturne`):
- [ ] Главная страница: заголовки в Cormorant Garamond, бейджи в Courier Prime, ничего не «прыгает» при загрузке.
- [ ] Settings → выпадашка шрифтов: каждое название в своём шрифте (после ~500мс).
- [ ] Settings → выбрать Lora → текст сменился.
- [ ] Перезагрузить страницу с Lora → нет мигания.
- [ ] Открыть RichEditor (`/requests/new`): выпадашка шрифтов работает, превью отрисованы в своём шрифте.
- [ ] Открыть `/library/[id]` для опубликованной игры → посты с пользовательскими шрифтами отрисованы корректно.
- [ ] Открыть активную игру → отправить пост с Caveat → шрифт подгружен.

- [ ] **Step 4: Network-проверка размера**

В DevTools → Network → Disable cache → жёсткая перезагрузка `/`. Отфильтровать по `font`:
- Должно быть **2 запроса** (Cormorant + Courier Prime, оба с `_next/static/media/`).
- Суммарный размер — порядка 50-80 КБ.
- НЕТ запросов на `fonts.googleapis.com` (если siteFont = Georgia default).

- [ ] **Step 5: Lighthouse audit (опционально)**

В DevTools → Lighthouse → Performance audit на главной. Сравнить с предыдущим деплоем — LCP должен улучшиться на 200-500мс.

- [ ] **Step 6: Деплой на сервер**

```bash
cd product-mvp && bash deploy.sh
```

Open https://(prod-host)/ → проверить визуально что страница выглядит как раньше, шрифты грузятся.

- [ ] **Step 7: Проверка на проде**

То же что в Step 3, но на production-домене. Особое внимание — никакого FOUC при перезаходе с Lora.

- [ ] **Step 8: Проверить админские view на наличие постов с шрифтами**

Открыть в браузере под админом (luna):
- `/admin/reports` — отображаются ли посты в превью жалоб? Если да — проверить что font-family из постов подгружается.
- `/admin` (любые подстраницы где может быть превью игр на модерации) — то же.

Если view показывает HTML постов и шрифты НЕ подгружаются автоматически (видны как Georgia вместо выбранного) — добавить в соответствующий компонент (`AdminReports.tsx` или admin/games/[id]) тот же паттерн что в Task 11:

```ts
useEffect(() => {
  const fonts = new Set<string>()
  for (const item of itemsWithHtml) {
    for (const f of extractGoogleFontsFromHtml(item.body_html)) fonts.add(f)
  }
  if (fonts.size > 0) loadFonts([...fonts])
}, [itemsWithHtml])
```

Если view не показывает HTML постов (только metadata, имена, причины жалоб) — пропустить, ничего делать не нужно.

- [ ] **Step 9: Финальный commit + memory update**

Если в коде остались мелкие правки после ручной проверки — закоммитить.

После деплоя — обновить `MEMORY.md` записью о завершении этой работы:

```bash
# В .claude/projects/c--Users-Pirozenka-Desktop-apocrif/memory/
# Добавить файл project_fonts_lazy_loading.md и ссылку в MEMORY.md
```

---

## Notes

- **Если step требует знания реальных названий переменных в существующих компонентах** (`fontDropdownOpen`, `body_html`, `messages`), всегда сначала открыть файл и взять имя из кода. Не использовать имена из плана как догму — план описывает структуру правки, не точные идентификаторы.
- **TDD-strict**: каждая Task с тестом — пишется тест, проверяется что упал, потом implementation, потом проверяется что прошёл. Не пропускать шаг «проверить что упал» — иначе можно случайно написать тест который проходит изначально.
- **Один Task — один commit (или несколько). Не сваливать всё в один commit.** Это даёт возможность откатить отдельные шаги.
- **Если в Task 5 (`next/font`) что-то не работает** (например, build падает с ошибкой про subset), убрать `'cyrillic'` из `subsets` — Cormorant Garamond/Courier Prime могут не поддерживать кириллицу. Тогда оставить только `['latin']` и добавить fallback на Georgia/Courier New для кириллических символов (что уже есть в CSS-стеке).
