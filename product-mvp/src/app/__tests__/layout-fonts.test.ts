import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Регрессионный страж миграции на lazy-loading шрифтов.
// Защищает от отката трёх вещей одновременно:
//   1) Большой `<link>` со списком 18 шрифтов из fonts.googleapis.com
//      больше не должен висеть в head — first paint грузит только
//      критичные next/font (Cormorant Garamond + Courier Prime).
//   2) Cormorant Garamond и Courier Prime self-hosted через
//      `next/font/google`, а не через runtime <link>.
//   3) FOUC-bootstrap для сохранённого пользователем siteFont
//      запускается синхронно в head, чтобы не было миганий.
//
// Если кто-то возвращает старый 18-шрифтовый `<link>`, этот тест
// упадёт и подскажет — fix it, don't merge.

const layoutSrc = readFileSync(
  join(__dirname, '..', 'layout.tsx'),
  'utf8',
)

describe('layout.tsx — fonts migration regression guard', () => {
  it('does not include the legacy 18-font Google Fonts <link>', () => {
    // Старый блок легко узнать по нескольким семействам в одной URL —
    // если хоть одно из них есть в href, значит регрессия.
    expect(layoutSrc).not.toMatch(/fonts\.googleapis\.com[^"']*Lora/)
    expect(layoutSrc).not.toMatch(/fonts\.googleapis\.com[^"']*Playfair/)
    expect(layoutSrc).not.toMatch(/fonts\.googleapis\.com[^"']*PT\+Serif/)
    expect(layoutSrc).not.toMatch(/fonts\.googleapis\.com[^"']*Caveat/)
  })

  it('does not preconnect to fonts.googleapis.com (handled by next/font)', () => {
    expect(layoutSrc).not.toMatch(/preconnect[^>]+fonts\.googleapis\.com/)
    expect(layoutSrc).not.toMatch(/preconnect[^>]+fonts\.gstatic\.com/)
  })

  it('uses next/font/google for the two critical fonts', () => {
    expect(layoutSrc).toMatch(/from ['"]next\/font\/google['"]/)
    expect(layoutSrc).toMatch(/Cormorant_Garamond\s*\(/)
    expect(layoutSrc).toMatch(/Courier_Prime\s*\(/)
    // CSS-переменные next/font должны попадать на <html>
    expect(layoutSrc).toMatch(/cormorantGaramond\.variable/)
    expect(layoutSrc).toMatch(/courierPrime\.variable/)
  })

  it('inlines the FOUC bootstrap for siteFont preload with nonce', () => {
    expect(layoutSrc).toMatch(/buildFontsBootstrapScript/)
    // Скрипт должен попадать в head через dangerouslySetInnerHTML
    expect(layoutSrc).toMatch(/dangerouslySetInnerHTML=\{\{\s*__html:\s*fontsBootstrap\s*\}\}/)
    // Nonce обязателен, иначе CSP заблокирует. JSX может быть многострочным,
    // поэтому ищем атрибут внутри тега <script ... fontsBootstrap ... />.
    const scriptTags = layoutSrc.match(/<script\b[\s\S]*?\/>/g) ?? []
    const fontsScript = scriptTags.find((t) => t.includes('fontsBootstrap'))
    expect(fontsScript, 'fontsBootstrap <script> tag').toBeDefined()
    expect(fontsScript!).toContain('nonce={nonce}')
  })
})
