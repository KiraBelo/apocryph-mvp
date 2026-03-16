// In-memory rate limiter (single-process, survives HMR via globalThis)
const g = globalThis as unknown as { __rateLimitStore?: Map<string, { count: number; resetAt: number }>; __rateLimitCleanup?: ReturnType<typeof setInterval> }
if (!g.__rateLimitStore) g.__rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const store: Map<string, { count: number; resetAt: number }> = g.__rateLimitStore

export function rateLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean; remaining: number } {
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
