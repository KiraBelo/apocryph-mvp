import { NextRequest, NextResponse } from 'next/server'

// Own rate-limit store for Edge Runtime (cannot import src/lib/rate-limit.ts)
const g = globalThis as unknown as { __mwRateStore?: Map<string, { count: number; resetAt: number }> }
if (!g.__mwRateStore) g.__mwRateStore = new Map()
const store = g.__mwRateStore

function checkRate(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count++
  return entry.count <= max
}

// Matches /api/games/{gameId}/messages/stream
const STREAM_RE = /^\/api\/games\/[^/]+\/messages\/stream(\/|$)/

// Matches /api/games/{gameId}/messages  (exact, NOT /stream)
const MESSAGES_RE = /^\/api\/games\/[^/]+\/messages(\/)?$/

const WINDOW_MS = 60 * 1000 // 1 minute

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Never rate-limit SSE streams — they are long-lived connections
  if (STREAM_RE.test(pathname)) {
    return NextResponse.next()
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const method = req.method.toUpperCase()

  if (method === 'POST') {
    // Stricter limit for the messages endpoint
    if (MESSAGES_RE.test(pathname)) {
      const key = `post:msg:${ip}`
      if (!checkRate(key, 20, WINDOW_MS)) {
        return NextResponse.json({ error: 'tooManyRequests' }, { status: 429 })
      }
    }

    // General POST limit
    const key = `post:${ip}`
    if (!checkRate(key, 30, WINDOW_MS)) {
      return NextResponse.json({ error: 'tooManyRequests' }, { status: 429 })
    }
  } else {
    // GET and all other methods
    const key = `get:${ip}`
    if (!checkRate(key, 100, WINDOW_MS)) {
      return NextResponse.json({ error: 'tooManyRequests' }, { status: 429 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
