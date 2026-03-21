import { describe, it, expect } from 'vitest'
import { escapeHtml, feedPostBg, isSMSOnly, paginationRange } from '../game-utils'

describe('escapeHtml', () => {
  it('escapes &, <, >, "', () => {
    expect(escapeHtml('&<>"')).toBe('&amp;&lt;&gt;&quot;')
  })

  it('leaves safe text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('escapes mixed content', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })
})

describe('feedPostBg', () => {
  it('returns deterministic result for same userId', () => {
    const a = feedPostBg('user-123')
    const b = feedPostBg('user-123')
    expect(a).toBe(b)
  })

  it('returns a string from the palette', () => {
    const result = feedPostBg('any-user-id')
    expect(result).toMatch(/^rgba\(/)
  })

  it('does not throw for empty string', () => {
    expect(() => feedPostBg('')).not.toThrow()
  })

  it('does not throw for very long userId', () => {
    expect(() => feedPostBg('a'.repeat(10000))).not.toThrow()
  })
})

describe('isSMSOnly', () => {
  it('returns true when content is only sms-bubble divs', () => {
    expect(isSMSOnly('<div class="sms-bubble">hello</div>')).toBe(true)
  })

  it('returns true for multiple sms-bubble divs', () => {
    expect(
      isSMSOnly('<div class="sms-bubble">one</div><div class="sms-bubble">two</div>')
    ).toBe(true)
  })

  it('returns false for mixed content', () => {
    expect(isSMSOnly('<div class="sms-bubble">hi</div><p>normal text</p>')).toBe(false)
  })

  it('returns false for plain text', () => {
    expect(isSMSOnly('just some text')).toBe(false)
  })

  it('returns true for sms-bubble followed by empty paragraph', () => {
    expect(isSMSOnly('<div class="sms-bubble">msg</div><p></p>')).toBe(true)
  })
})

describe('paginationRange', () => {
  it('returns all pages when total <= 7', () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('returns [1] when total is 1', () => {
    expect(paginationRange(1, 1)).toEqual([1])
  })

  it('returns all 7 pages without ellipsis', () => {
    expect(paginationRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('includes ellipsis for large total, current at start', () => {
    const result = paginationRange(1, 20)
    expect(result[0]).toBe(1)
    expect(result[result.length - 1]).toBe(20)
    expect(result).toContain('...')
  })

  it('includes ellipsis for large total, current in middle', () => {
    const result = paginationRange(10, 20)
    expect(result[0]).toBe(1)
    expect(result[result.length - 1]).toBe(20)
    expect(result).toContain('...')
    expect(result).toContain(10)
  })

  it('includes ellipsis for large total, current at end', () => {
    const result = paginationRange(20, 20)
    expect(result[0]).toBe(1)
    expect(result[result.length - 1]).toBe(20)
    expect(result).toContain('...')
  })

  it('always starts with 1 and ends with total', () => {
    for (const current of [1, 5, 10, 15, 20]) {
      const result = paginationRange(current, 20)
      expect(result[0]).toBe(1)
      expect(result[result.length - 1]).toBe(20)
    }
  })
})
