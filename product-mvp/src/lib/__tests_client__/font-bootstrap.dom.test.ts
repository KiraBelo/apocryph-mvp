import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildFontsBootstrapScript } from '../font-bootstrap'

describe('buildFontsBootstrapScript', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

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
    expect(script).toContain('"Lora"')
    expect(script).toContain('400;500')
  })

  it('does not throw when executed with no localStorage value', () => {
    const script = buildFontsBootstrapScript()
     
    new Function(script)()
    expect(document.head.querySelectorAll('link').length).toBe(0)
  })

  it('adds <link> when localStorage has Lora', () => {
    localStorage.setItem('apocryph-site-font', 'Lora, Georgia, serif')
    const script = buildFontsBootstrapScript()
     
    new Function(script)()
    const links = document.head.querySelectorAll('link[rel="stylesheet"]')
    expect(links.length).toBe(1)
    expect((links[0] as HTMLLinkElement).href).toContain('family=Lora')
  })

  it('does not add <link> for default Georgia', () => {
    localStorage.setItem('apocryph-site-font', 'Georgia, serif')
    const script = buildFontsBootstrapScript()
     
    new Function(script)()
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(0)
  })

  it('does not add <link> for unknown font', () => {
    localStorage.setItem('apocryph-site-font', 'Comic Sans MS')
    const script = buildFontsBootstrapScript()
     
    new Function(script)()
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(0)
  })

  it('also sets --site-font CSS variable for the saved font', () => {
    localStorage.setItem('apocryph-site-font', 'Lora, Georgia, serif')
    const script = buildFontsBootstrapScript()
     
    new Function(script)()
    expect(document.documentElement.style.getPropertyValue('--site-font')).toBe(
      'Lora, Georgia, serif'
    )
  })
})
