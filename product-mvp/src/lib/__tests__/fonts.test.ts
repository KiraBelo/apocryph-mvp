import { describe, it, expect } from 'vitest'
import { FONT_GROUPS, ALL_FONTS, FONT_METADATA, LAZY_GOOGLE_FONTS } from '../fonts'

describe('fonts catalog', () => {
  it('ALL_FONTS contains every font from FONT_GROUPS', () => {
    const totalFromGroups = FONT_GROUPS.reduce((acc, g) => acc + g.fonts.length, 0)
    expect(ALL_FONTS.length).toBe(totalFromGroups)
  })

  it('every font has googleName, weights, italic fields', () => {
    for (const f of ALL_FONTS) {
      expect(f).toHaveProperty('googleName')
      expect(f).toHaveProperty('weights')
      expect(f).toHaveProperty('italic')
      expect(typeof f.italic).toBe('boolean')
      expect(typeof f.weights).toBe('string')
    }
  })

  it('non-null googleName implies non-empty weights', () => {
    for (const f of ALL_FONTS) {
      if (f.googleName !== null) {
        expect(f.weights, `${f.label} has googleName but empty weights`).not.toBe('')
      }
    }
  })

  it('null googleName implies empty weights and italic=false', () => {
    for (const f of ALL_FONTS) {
      if (f.googleName === null) {
        expect(f.weights, `${f.label} has null googleName but non-empty weights`).toBe('')
        expect(f.italic, `${f.label} has null googleName but italic=true`).toBe(false)
      }
    }
  })
})

describe('FONT_METADATA derived export', () => {
  it('contains exactly the fonts with non-null googleName', () => {
    const expectedKeys = ALL_FONTS.filter(f => f.googleName !== null).map(f => f.googleName!)
    expect(Object.keys(FONT_METADATA).sort()).toEqual(expectedKeys.sort())
  })

  it('has no duplicate googleName keys (no silent overwrites)', () => {
    const googleNames = ALL_FONTS.filter(f => f.googleName !== null).map(f => f.googleName!)
    const unique = new Set(googleNames)
    expect(unique.size).toBe(googleNames.length)
  })

  it('Lora has weights=400;500 and italic=true', () => {
    expect(FONT_METADATA['Lora']).toEqual({ weights: '400;500', italic: true })
  })

  it('Caveat has weights=400;500 and italic=false', () => {
    expect(FONT_METADATA['Caveat']).toEqual({ weights: '400;500', italic: false })
  })

  it('Neucha has weights=400 and italic=false', () => {
    expect(FONT_METADATA['Neucha']).toEqual({ weights: '400', italic: false })
  })

  it('does not contain Cormorant (self-hosted via next/font)', () => {
    expect(FONT_METADATA['Cormorant Garamond']).toBeUndefined()
    expect(FONT_METADATA['Cormorant']).toBeUndefined()
  })

  it('does not contain system fonts (Georgia, Arial, etc)', () => {
    expect(FONT_METADATA['Georgia']).toBeUndefined()
    expect(FONT_METADATA['Arial']).toBeUndefined()
    expect(FONT_METADATA['Calibri']).toBeUndefined()
  })
})

describe('LAZY_GOOGLE_FONTS derived export', () => {
  it('matches Object.keys of FONT_METADATA', () => {
    expect(LAZY_GOOGLE_FONTS.sort()).toEqual(Object.keys(FONT_METADATA).sort())
  })

  it('contains expected catalog fonts', () => {
    expect(LAZY_GOOGLE_FONTS).toContain('Lora')
    expect(LAZY_GOOGLE_FONTS).toContain('PT Serif')
    expect(LAZY_GOOGLE_FONTS).toContain('Caveat')
    expect(LAZY_GOOGLE_FONTS).toContain('Roboto')
  })
})
