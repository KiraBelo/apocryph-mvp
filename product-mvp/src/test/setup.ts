import { beforeEach } from 'vitest'

// Required by lib/session.ts — must be set before any import of that module
process.env.SESSION_SECRET = 'test-secret-key-at-least-32-characters-long'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
// NODE_ENV is set automatically by vitest — assigning it here causes a TypeScript error

beforeEach(() => {
  // Reset in-memory rate limit store between tests
  if ('__rateLimitStore' in globalThis) {
    ;(globalThis as typeof globalThis & { __rateLimitStore: Map<string, unknown> }).__rateLimitStore.clear()
  }
})
