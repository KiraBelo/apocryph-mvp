import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Регрессионный страж: при открытии font-меню в RichEditor
// должен вызываться loadAllCatalogFonts() из @/lib/font-loader,
// иначе пользователь увидит дефолтные шрифты браузера в выпадашке
// вместо реальных Google Fonts (выпадашка построена на ленивой загрузке).
//
// Полноценный component-тест на TipTap слишком тяжёл (инициализация
// editor, ProseMirror в jsdom), поэтому проверяем источник.

const editorSrc = readFileSync(
  join(__dirname, '..', 'RichEditor.tsx'),
  'utf8',
)

describe('RichEditor — fonts dropdown integration', () => {
  it('imports loadAllCatalogFonts from font-loader', () => {
    expect(editorSrc).toMatch(/import\s*\{[^}]*loadAllCatalogFonts[^}]*\}\s*from\s*['"]@\/lib\/font-loader['"]/)
  })

  it('calls loadAllCatalogFonts when opening the font menu', () => {
    // Проверяем что вызов есть в коде onClick toggle-кнопки font-меню.
    // Точный паттерн: `if (!fontMenuOpen) loadAllCatalogFonts()`
    expect(editorSrc).toMatch(/if\s*\(\s*!fontMenuOpen\s*\)\s*loadAllCatalogFonts\(\)/)
  })
})
