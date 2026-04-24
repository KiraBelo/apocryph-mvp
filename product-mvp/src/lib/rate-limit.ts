// In-memory rate limiter (single-process, survives HMR via globalThis)
const g = globalThis as unknown as { __rateLimitStore?: Map<string, { count: number; resetAt: number }>; __rateLimitCleanup?: ReturnType<typeof setInterval> }
if (!g.__rateLimitStore) g.__rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const store: Map<string, { count: number; resetAt: number }> = g.__rateLimitStore

// Test-only escape hatch. Never set this in production — it is ONLY consumed
// by Playwright's webServer.env in playwright.config.ts to let the E2E suite
// burst many registrations/logins from a single IP without tripping limits.
// When the flag is absent (i.e. always, in prod/dev), rateLimit behaves normally.
const DISABLED = process.env.APOCRIPH_DISABLE_RATE_LIMIT === '1'

export function rateLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean; remaining: number } {
  if (DISABLED) return { allowed: true, remaining: maxAttempts }
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1 }
  }

  entry.count++
  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0 }
  }
  return { allowed: true, remaining: maxAttempts - entry.count }
}

// Cleanup expired entries every 5 minutes
if (!g.__rateLimitCleanup) {
  g.__rateLimitCleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 5 * 60 * 1000)
}
