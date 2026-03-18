import { describe, it, expect } from 'vitest'
import { sanitizeBody } from '../sanitize'

describe('sanitizeBody', () => {
  // ── Null / undefined / empty ──────────────────────────────────────────────
  describe('null / falsy inputs', () => {
    it('returns null for null', () => {
      expect(sanitizeBody(null)).toBeNull()
    })
    it('returns null for undefined', () => {
      expect(sanitizeBody(undefined)).toBeNull()
    })
    it('returns null for empty string', () => {
      expect(sanitizeBody('')).toBeNull()
    })
  })

  // ── Allowed tags survive ──────────────────────────────────────────────────
  describe('allowed tags', () => {
    it('keeps <p>', () => {
      expect(sanitizeBody('<p>Hello</p>')).toBe('<p>Hello</p>')
    })
    it('keeps <strong> and <em>', () => {
      expect(sanitizeBody('<p><strong>bold</strong> <em>italic</em></p>')).toContain('<strong>bold</strong>')
    })
    it('keeps <s> (strikethrough)', () => {
      expect(sanitizeBody('<s>struck</s>')).toContain('<s>struck</s>')
    })
    it('keeps <u> (underline)', () => {
      expect(sanitizeBody('<u>under</u>')).toContain('<u>under</u>')
    })
    it('keeps <blockquote>', () => {
      expect(sanitizeBody('<blockquote>quote</blockquote>')).toContain('<blockquote>')
    })
    it('keeps <pre> and <code>', () => {
      expect(sanitizeBody('<pre><code>const x = 1</code></pre>')).toContain('<pre><code>')
    })
    it('keeps <ul><li> lists', () => {
      const result = sanitizeBody('<ul><li>item</li></ul>')
      expect(result).toContain('<ul>')
      expect(result).toContain('<li>item</li>')
    })
    it('keeps <ol><li> lists', () => {
      const result = sanitizeBody('<ol><li>one</li></ol>')
      expect(result).toContain('<ol>')
    })
    it('keeps <h1>, <h2>, <h3>', () => {
      expect(sanitizeBody('<h1>Title</h1>')).toContain('<h1>Title</h1>')
      expect(sanitizeBody('<h2>Sub</h2>')).toContain('<h2>')
      expect(sanitizeBody('<h3>Sub2</h3>')).toContain('<h3>')
    })
    it('keeps <mark>', () => {
      expect(sanitizeBody('<mark>highlighted</mark>')).toContain('<mark>')
    })
    it('keeps <hr>', () => {
      expect(sanitizeBody('<hr>')).toContain('<hr')
    })
  })

  // ── Forbidden tags are stripped ───────────────────────────────────────────
  describe('XSS — dangerous tags stripped', () => {
    it('strips <script>', () => {
      const result = sanitizeBody('<p>text</p><script>alert(1)</script>')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert(1)')
    })
    it('strips <iframe>', () => {
      const result = sanitizeBody('<iframe src="https://evil.com"></iframe>')
      expect(result).not.toContain('<iframe>')
    })
    it('strips <object>', () => {
      expect(sanitizeBody('<object data="evil.swf"></object>')).not.toContain('<object>')
    })
    it('strips <form>', () => {
      expect(sanitizeBody('<form action="/steal"><input name="pwd"></form>')).not.toContain('<form>')
    })
    it('strips <img>', () => {
      expect(sanitizeBody('<img src="x" onerror="alert(1)">')).not.toContain('<img>')
    })
    it('strips <svg> with embedded script', () => {
      const result = sanitizeBody('<svg><script>alert(1)</script></svg>')
      expect(result).not.toContain('<svg>')
      expect(result).not.toContain('alert(1)')
    })
    it('strips <style>', () => {
      expect(sanitizeBody('<style>body{display:none}</style>')).not.toContain('<style>')
    })
    it('strips javascript: in href', () => {
      const result = sanitizeBody('<a href="javascript:alert(1)">click</a>')
      expect(result).not.toContain('javascript:')
    })
    it('strips data: URIs in href', () => {
      const result = sanitizeBody('<a href="data:text/html,<script>alert(1)</script>">x</a>')
      expect(result).not.toContain('data:')
    })
    it('strips vbscript: URIs', () => {
      const result = sanitizeBody('<a href="vbscript:msgbox(1)">x</a>')
      expect(result).not.toContain('vbscript:')
    })
    it('strips on* event handlers', () => {
      const result = sanitizeBody('<p onclick="alert(1)">text</p>')
      expect(result).not.toContain('onclick')
    })
    it('strips onerror on any tag', () => {
      const result = sanitizeBody('<span onerror="alert(1)">x</span>')
      expect(result).not.toContain('onerror')
    })
  })

  // ── Allowed attributes ────────────────────────────────────────────────────
  describe('allowed attributes', () => {
    it('keeps href on <a> with https', () => {
      const result = sanitizeBody('<a href="https://example.com">link</a>')
      expect(result).toContain('href="https://example.com"')
    })
    it('keeps href on <a> with http', () => {
      const result = sanitizeBody('<a href="http://example.com">link</a>')
      expect(result).toContain('href="http://example.com"')
    })
    it('keeps mailto: href on <a>', () => {
      const result = sanitizeBody('<a href="mailto:test@example.com">email</a>')
      expect(result).toContain('mailto:')
    })
    it('strips unknown attributes from <p>', () => {
      const result = sanitizeBody('<p data-evil="x">text</p>')
      expect(result).not.toContain('data-evil')
    })
  })

  // ── transformTags — <a> always gets rel + target ──────────────────────────
  describe('transformTags — link hardening', () => {
    it('adds rel="noopener noreferrer" to all links', () => {
      const result = sanitizeBody('<a href="https://example.com">link</a>')
      expect(result).toContain('rel="noopener noreferrer"')
    })
    it('adds target="_blank" to all links', () => {
      const result = sanitizeBody('<a href="https://example.com">link</a>')
      expect(result).toContain('target="_blank"')
    })
    it('overwrites existing rel attribute', () => {
      const result = sanitizeBody('<a href="https://x.com" rel="follow">x</a>')
      expect(result).toContain('rel="noopener noreferrer"')
      expect(result).not.toContain('rel="follow"')
    })
  })

  // ── Allowed styles ────────────────────────────────────────────────────────
  describe('CSS styles', () => {
    it('keeps valid hex color', () => {
      const result = sanitizeBody('<p style="color: #ff0000">red</p>')
      expect(result).toContain('color')
    })
    it('keeps rgb() color', () => {
      const result = sanitizeBody('<p style="color: rgb(255, 0, 0)">red</p>')
      expect(result).toContain('color')
    })
    it('keeps text-align: center', () => {
      const result = sanitizeBody('<p style="text-align: center">centered</p>')
      expect(result).toContain('text-align')
    })
    it('strips expression() CSS injection', () => {
      const result = sanitizeBody('<p style="color: expression(alert(1))">x</p>')
      expect(result).not.toContain('expression')
    })
    it('strips url() in styles', () => {
      const result = sanitizeBody('<p style="background: url(javascript:alert(1))">x</p>')
      expect(result).not.toContain('url(')
    })
  })

  // ── Allowed CSS classes ───────────────────────────────────────────────────
  describe('allowed CSS classes', () => {
    it('keeps div.sms-bubble', () => {
      const result = sanitizeBody('<div class="sms-bubble">text</div>')
      expect(result).toContain('class="sms-bubble"')
    })
    it('keeps p.sms-meta', () => {
      const result = sanitizeBody('<p class="sms-meta">meta</p>')
      expect(result).toContain('class="sms-meta"')
    })
    it('keeps span.ooc-spoiler', () => {
      const result = sanitizeBody('<span class="ooc-spoiler">hidden</span>')
      expect(result).toContain('class="ooc-spoiler"')
    })
    it('strips arbitrary CSS classes', () => {
      const result = sanitizeBody('<div class="evil-class">x</div>')
      expect(result).not.toContain('evil-class')
    })
  })

  // ── Plain text passthrough ────────────────────────────────────────────────
  describe('plain text', () => {
    it('passes plain text through unchanged', () => {
      const result = sanitizeBody('hello world')
      expect(result).toBe('hello world')
    })
    it('preserves nested allowed tags', () => {
      const html = '<p><strong><em>bold italic</em></strong></p>'
      const result = sanitizeBody(html)
      expect(result).toContain('<strong>')
      expect(result).toContain('<em>')
    })
  })
})
