import { query } from './db'

interface StopPhrase {
  id: number
  phrase: string
}

let cache: { phrases: StopPhrase[]; ts: number } | null = null
const CACHE_TTL = 60_000

export async function getActiveStopPhrases(): Promise<StopPhrase[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.phrases
  const rows = await query<StopPhrase>(
    'SELECT id, phrase FROM stop_phrases WHERE is_active = true'
  )
  cache = { phrases: rows, ts: Date.now() }
  return rows
}

export function invalidateStopPhraseCache() {
  cache = null
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export interface StopMatch {
  phraseId: number
  phrase: string
  context: string
}

export function checkStopList(html: string, phrases: StopPhrase[]): StopMatch | null {
  const text = stripHtml(html)
  for (const p of phrases) {
    const idx = text.indexOf(p.phrase)
    if (idx >= 0) {
      const start = Math.max(0, idx - 25)
      const end = Math.min(text.length, idx + p.phrase.length + 25)
      return {
        phraseId: p.id,
        phrase: p.phrase,
        context: text.slice(start, end),
      }
    }
  }
  return null
}

export const VIOLATION_THRESHOLD = 3
