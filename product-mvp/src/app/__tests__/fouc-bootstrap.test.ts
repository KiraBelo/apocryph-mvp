import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Pin the FOUC bootstrap script (audit-v4 medium). The script in
// src/app/layout.tsx must:
//   - run synchronously in <head> before React boots
//   - validate the localStorage value against the same theme list
//     ThemeProvider knows about (light / sepia / ink / nocturne)
//   - swallow exceptions so a quota-exceeded localStorage cannot brick
//     the whole site
//
// If a new theme is added, this test fails — forcing the dev to update
// the bootstrap too. Without this guard, the new theme would silently
// flash light on first paint for users who already saved it.

const layoutSrc = readFileSync(
  join(__dirname, '..', 'layout.tsx'),
  'utf8',
)
const themeProviderSrc = readFileSync(
  join(__dirname, '..', '..', 'components', 'ThemeProvider.tsx'),
  'utf8',
)

describe('FOUC bootstrap script in layout.tsx (audit-v4 medium)', () => {
  it('reads the saved theme from localStorage and applies it before paint', () => {
    expect(layoutSrc).toMatch(/localStorage\.getItem\(['"]apocryph-theme['"]\)/)
    expect(layoutSrc).toMatch(/document\.documentElement\.setAttribute\(['"]data-theme['"]/)
  })

  it('validates the theme against the same set ThemeProvider accepts', () => {
    // Both files must list the same valid themes — extracting them by
    // regex and comparing makes the relationship explicit.
    const layoutThemes = extractThemes(layoutSrc)
    const providerThemes = extractThemes(themeProviderSrc)
    expect(layoutThemes.length).toBeGreaterThan(0)
    expect(layoutThemes.sort()).toEqual(providerThemes.sort())
  })

  it('wraps the body in try/catch so a localStorage exception cannot brick the site', () => {
    expect(layoutSrc).toMatch(/try\s*\{[\s\S]*localStorage[\s\S]*\}\s*catch/)
  })

  it('passes the per-request CSP nonce to the bootstrap <script>', () => {
    // Without nonce, the inline script gets blocked on modern browsers
    // by the strict-dynamic CSP set in middleware.ts (HIGH-S1 fix).
    expect(layoutSrc).toMatch(/<script\s+nonce=\{nonce\}/)
  })
})

function extractThemes(src: string): string[] {
  // Both files write the theme list as something like:
  //   ['light','sepia','ink','nocturne']
  //   ['light', 'sepia', 'ink', 'nocturne']
  const m = src.match(/\[\s*'light'[^\]]*\]/)
  if (!m) return []
  return m[0].match(/'([a-z]+)'/g)?.map(s => s.replace(/'/g, '')) ?? []
}
