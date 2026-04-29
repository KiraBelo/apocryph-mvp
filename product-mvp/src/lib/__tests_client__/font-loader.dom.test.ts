import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadFont,
  loadFonts,
  loadAllCatalogFonts,
  _resetLoadedForTests,
} from '../font-loader'

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
    loadFonts(['Lora', 'PT Serif'])
    const links = document.head.querySelectorAll('link[rel="stylesheet"]')
    expect(links.length).toBe(2)
    const newLink = links[1] as HTMLLinkElement
    expect(newLink.href).toContain('family=PT+Serif')
    expect(newLink.href).not.toContain('family=Lora')
  })

  it('does nothing if all fonts already loaded', () => {
    loadFont('Lora')
    loadFonts(['Lora'])
    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(1)
  })
})

describe('loadFont — deduplicates against existing DOM links', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    _resetLoadedForTests()
  })

  it('does not append a second <link> when one already exists for that font', () => {
    // Имитируем работу FOUC-bootstrap скрипта: вставляем <link> вручную.
    const preloaded = document.createElement('link')
    preloaded.rel = 'stylesheet'
    preloaded.href = 'https://fonts.googleapis.com/css2?family=Lora:wght@400&display=swap'
    document.head.appendChild(preloaded)

    loadFont('Lora')

    expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(1)
  })

  it('loadFonts skips fonts already present in DOM', () => {
    const preloaded = document.createElement('link')
    preloaded.rel = 'stylesheet'
    preloaded.href = 'https://fonts.googleapis.com/css2?family=Lora:wght@400&display=swap'
    document.head.appendChild(preloaded)

    loadFonts(['Lora', 'PT Serif'])

    const links = document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    expect(links.length).toBe(2)
    expect(links[1].href).toContain('family=PT+Serif')
    expect(links[1].href).not.toContain('family=Lora')
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
