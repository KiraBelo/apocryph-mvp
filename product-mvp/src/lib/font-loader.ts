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
