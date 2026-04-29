import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Регрессионный страж: GameDialogClient должен лениво подгружать
// Google-шрифты, встретившиеся в IC/OOC-постах, при первичной загрузке
// и при SSE-апдейтах. Полный component-тест на этот компонент тяжёл
// (TipTap + SSE + множество хуков), поэтому проверяем источник.

const src = readFileSync(
  join(__dirname, '..', 'GameDialogClient.tsx'),
  'utf8',
)

describe('GameDialogClient — fonts integration', () => {
  it('imports extractGoogleFontsFromHtml and loadFonts from font-loader', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*extractGoogleFontsFromHtml[^}]*loadFonts[^}]*\}\s*from\s*['"]@\/lib\/font-loader['"]/,
    )
  })

  it('reacts to message changes (icMessages/oocMessages) and calls loadFonts when fonts found', () => {
    expect(src).toMatch(/extractGoogleFontsFromHtml\([\s\S]*?\)/)
    expect(src).toMatch(/loadFonts\(fonts\)/)
    // Эффект должен зависеть от обоих массивов сообщений, чтобы ловить
    // SSE-апдейты IC и OOC.
    expect(src).toMatch(/\[chat\.icMessages,\s*chat\.oocMessages\]/)
  })
})
