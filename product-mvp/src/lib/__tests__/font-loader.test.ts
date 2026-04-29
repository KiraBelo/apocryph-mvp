import { describe, it, expect } from 'vitest'
import { parseFirstFontName, buildFontLinkUrl, extractGoogleFontsFromHtml } from '../font-loader'

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
      'https://fonts.googleapis.com/css2?family=Lora:wght@400&family=Caveat:wght@400;500&display=swap'
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
