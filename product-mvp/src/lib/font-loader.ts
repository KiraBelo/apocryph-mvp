import { FONT_METADATA, LAZY_GOOGLE_FONTS } from './fonts'

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
  // Матчим значение font-family до закрывающей кавычки атрибута style (" или ') или ; (конец CSS-свойства)
  // Чтобы при этом захватить "Open Sans" внутри двойных кавычек атрибута, разрешаем
  // первый символ значения быть открывающей кавычкой противоположного типа.
  const matches = html.matchAll(/font-family:\s*([^;"<>]*?(?:"[^"]*"|'[^']*')?[^;"<>]*?)\s*(?:;|"|'|>)/gi)
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

/**
 * Уже ли есть в `<head>` `<link>` для этого шрифта (например, добавленный
 * FOUC-bootstrap в layout.tsx). Сравниваем по `family=<encoded name>` —
 * это уникальный сегмент Google Fonts CSS API URL.
 */
function isFontInDom(name: string): boolean {
  if (typeof document === 'undefined') return false
  const encoded = encodeURIComponent(name).replace(/%20/g, '+')
  const needle = `family=${encoded}`
  const links = document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  for (const link of links) {
    const href = link.href
    if (!href.includes('fonts.googleapis.com')) continue
    if (
      href.includes(`${needle}&`) ||
      href.includes(`${needle}:`) ||
      href.endsWith(needle)
    ) {
      return true
    }
  }
  return false
}

/** Грузит один Google-шрифт. Принимает либо имя (`'Lora'`), либо CSS-список (`'Lora, serif'`). Идемпотентно. */
export function loadFont(input: string): void {
  const name = parseFirstFontName(input)
  if (!name) return
  if (_loaded.has(name)) return
  if (isFontInDom(name)) {
    _loaded.add(name)
    return
  }
  const spec = toSpec(name)
  if (!spec) return
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
    if (isFontInDom(name)) {
      _loaded.add(name)
      continue
    }
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
  const remaining = LAZY_GOOGLE_FONTS.filter((n) => !_loaded.has(n) && !isFontInDom(n))
  if (remaining.length > 0) {
    const specs = remaining.map(toSpec).filter((s): s is FontSpec => s !== null)
    appendLink(buildFontLinkUrl(specs))
    for (const s of specs) _loaded.add(s.name)
  }
  _allCatalogLoaded = true
}
