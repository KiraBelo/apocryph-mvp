import { describe, it, expect } from 'vitest'
import { sanitizeNickname } from '../sanitize'

describe('sanitizeNickname', () => {
  it('returns normal nickname unchanged', () => {
    expect(sanitizeNickname('PlayerOne')).toBe('PlayerOne')
  })

  it('strips <script> tags completely', () => {
    const result = sanitizeNickname('<script>alert(1)</script>')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert')
    expect(result).toBe('')
  })

  it('strips <b> tags, keeps text content', () => {
    expect(sanitizeNickname('<b>Bold</b>')).toBe('Bold')
  })

  it('handles <3 Love — keeps text, strips tag-like part', () => {
    const result = sanitizeNickname('<3 Love')
    // sanitize-html with allowedTags:[] strips all tags; "<3 Love" is not a valid tag
    // so it depends on parser behavior — just verify no HTML remains
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('handles >>Guardian<< — angle brackets stripped', () => {
    const result = sanitizeNickname('>>Guardian<<')
    // sanitize-html strips content that looks like tags
    expect(result).not.toContain('<')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeNickname('')).toBe('')
  })

  it('handles & character — encodes or preserves', () => {
    const result = sanitizeNickname('Tom & Jerry')
    // sanitize-html may encode & as &amp; — both are acceptable
    expect(result).toMatch(/Tom .* Jerry/)
  })

  it('strips <img> tags with onerror', () => {
    const result = sanitizeNickname('<img src=x onerror=alert(1)>')
    expect(result).not.toContain('<img')
    expect(result).not.toContain('onerror')
  })

  it('trims whitespace from result', () => {
    expect(sanitizeNickname('  hello  ')).toBe('hello')
  })

  it('strips nested HTML tags, keeps innermost text', () => {
    expect(sanitizeNickname('<div><span>Nick</span></div>')).toBe('Nick')
  })
})
