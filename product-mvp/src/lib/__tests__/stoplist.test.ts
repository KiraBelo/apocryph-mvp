import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkStopList, invalidateStopPhraseCache, VIOLATION_THRESHOLD } from '../stoplist'

// Мокаем lib/db — getActiveStopPhrases его использует
vi.mock('../db', () => ({
  query: vi.fn(),
}))

import { query } from '../db'
const mockQuery = vi.mocked(query)

// Сбрасываем кэш стоп-фраз между тестами
beforeEach(() => {
  invalidateStopPhraseCache()
  vi.clearAllMocks()
})

// ── Константа ─────────────────────────────────────────────────────────────
describe('VIOLATION_THRESHOLD', () => {
  it('is 3', () => {
    expect(VIOLATION_THRESHOLD).toBe(3)
  })
})

// ── checkStopList — чистая функция ───────────────────────────────────────
describe('checkStopList', () => {
  describe('no match', () => {
    it('returns null when phrase list is empty', () => {
      expect(checkStopList('<p>innocent text</p>', [])).toBeNull()
    })

    it('returns null when text does not contain any phrase', () => {
      const phrases = [{ id: 1, phrase: 'badword' }]
      expect(checkStopList('<p>innocent text</p>', phrases)).toBeNull()
    })

    it('returns null for empty html', () => {
      expect(checkStopList('', [{ id: 1, phrase: 'bad' }])).toBeNull()
    })
  })

  describe('match found', () => {
    it('returns match when phrase is found in plain text', () => {
      const phrases = [{ id: 42, phrase: 'badword' }]
      const result = checkStopList('<p>this contains badword here</p>', phrases)
      expect(result).not.toBeNull()
      expect(result!.phraseId).toBe(42)
      expect(result!.phrase).toBe('badword')
    })

    it('returns context snippet (±25 chars around match)', () => {
      const phrases = [{ id: 1, phrase: 'target' }]
      const result = checkStopList('<p>here is the target phrase</p>', phrases)
      expect(result!.context).toContain('target')
    })

    it('finds first matching phrase when multiple phrases given', () => {
      const phrases = [
        { id: 1, phrase: 'first' },
        { id: 2, phrase: 'second' },
      ]
      const result = checkStopList('<p>second and first</p>', phrases)
      // checkStopList iterates phrases in order, finds 'first' at index which comes after 'second' in text
      // but iteration order is by phrases array, so id=1 (first) should match
      expect(result!.phraseId).toBe(1)
    })

    it('returns phraseId and phrase name correctly', () => {
      const phrases = [{ id: 99, phrase: 'forbidden' }]
      const result = checkStopList('this is forbidden content', phrases)
      expect(result!.phraseId).toBe(99)
      expect(result!.phrase).toBe('forbidden')
    })
  })

  describe('stripHtml — HTML stripped before matching', () => {
    it('detects phrase hidden inside HTML tags', () => {
      const phrases = [{ id: 1, phrase: 'badword' }]
      const result = checkStopList('<strong>badword</strong>', phrases)
      expect(result).not.toBeNull()
    })

    it('does not match phrase split across tags', () => {
      // "ba" in one tag, "dword" in another — should NOT match "badword"
      const phrases = [{ id: 1, phrase: 'badword' }]
      const result = checkStopList('<p>ba</p><p>dword</p>', phrases)
      // After stripHtml: "ba dword" — space separator means no match
      expect(result).toBeNull()
    })

    it('matches case-insensitively (stripHtml lowercases text)', () => {
      const phrases = [{ id: 1, phrase: 'badword' }]
      const result = checkStopList('<p>BADWORD</p>', phrases)
      expect(result).not.toBeNull()
    })

    it('matches mixed case text', () => {
      const phrases = [{ id: 1, phrase: 'forbidden' }]
      const result = checkStopList('<p>This Is FORBIDDEN content</p>', phrases)
      expect(result).not.toBeNull()
    })
  })

  describe('stripHtml — HTML entities decoded', () => {
    it('decodes &amp; before matching', () => {
      const phrases = [{ id: 1, phrase: 'a&b' }]
      const result = checkStopList('<p>a&amp;b</p>', phrases)
      expect(result).not.toBeNull()
    })

    it('decodes &lt; and &gt; before matching', () => {
      const phrases = [{ id: 1, phrase: 'a<b' }]
      const result = checkStopList('<p>a&lt;b</p>', phrases)
      expect(result).not.toBeNull()
    })

    it('decodes &quot; before matching', () => {
      const phrases = [{ id: 1, phrase: 'say "hello"' }]
      const result = checkStopList('<p>say &quot;hello&quot;</p>', phrases)
      expect(result).not.toBeNull()
    })

    it("decodes &#39; (apostrophe) before matching", () => {
      const phrases = [{ id: 1, phrase: "it's bad" }]
      const result = checkStopList("<p>it&#39;s bad</p>", phrases)
      expect(result).not.toBeNull()
    })
  })

  describe('context window', () => {
    it('context does not exceed ±25 chars around match', () => {
      const longPre = 'a'.repeat(100)
      const longPost = 'b'.repeat(100)
      const phrases = [{ id: 1, phrase: 'target' }]
      const result = checkStopList(`${longPre}target${longPost}`, phrases)
      // context = slice(max(0, idx-25), min(len, idx+phrase.len+25))
      expect(result!.context.length).toBeLessThanOrEqual(25 + 6 + 25) // 25 + "target" + 25
    })

    it('handles phrase at start of text (no truncation error)', () => {
      const phrases = [{ id: 1, phrase: 'badword' }]
      const result = checkStopList('badword in text', phrases)
      expect(result).not.toBeNull()
      expect(result!.context).toContain('badword')
    })

    it('handles phrase at end of text', () => {
      const phrases = [{ id: 1, phrase: 'badword' }]
      const result = checkStopList('text ends with badword', phrases)
      expect(result).not.toBeNull()
      expect(result!.context).toContain('badword')
    })
  })
})

// ── getActiveStopPhrases — требует мок БД ────────────────────────────────
describe('getActiveStopPhrases', () => {
  it('fetches from DB and returns phrases', async () => {
    const { getActiveStopPhrases } = await import('../stoplist')
    const mockPhrases = [{ id: 1, phrase: 'test' }]
    mockQuery.mockResolvedValueOnce(mockPhrases)

    const result = await getActiveStopPhrases()
    expect(result).toEqual(mockPhrases)
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT id, phrase FROM stop_phrases WHERE is_active = true'
    )
  })

  it('caches result and does not re-query within TTL', async () => {
    const { getActiveStopPhrases } = await import('../stoplist')
    const mockPhrases = [{ id: 2, phrase: 'cached' }]
    mockQuery.mockResolvedValueOnce(mockPhrases)

    await getActiveStopPhrases()
    await getActiveStopPhrases() // second call — should use cache
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('re-queries after cache invalidation', async () => {
    const { getActiveStopPhrases } = await import('../stoplist')
    mockQuery.mockResolvedValue([{ id: 3, phrase: 'fresh' }])

    await getActiveStopPhrases()
    invalidateStopPhraseCache()
    await getActiveStopPhrases()
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })
})
