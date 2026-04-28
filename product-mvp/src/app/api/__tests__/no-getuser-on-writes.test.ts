import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

function findRouteFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) findRouteFiles(full, out)
    else if (entry === 'route.ts') out.push(full)
  }
  return out
}

/**
 * Regression guard for audit-v4 CRIT-2.
 *
 * `getUser()` only reads the session cookie — it does NOT check the DB
 * for the user's `banned_at` flag or compare `session_version`. That is
 * fine for read endpoints (worst case: a banned user sees their own
 * data), but on write endpoints it lets a banned user keep editing,
 * commenting, etc. — exactly the bug CRIT-2 caught in 4 places.
 *
 * This test scans every `route.ts` under `src/app/api/` and, for each
 * `export async function POST | PATCH | PUT | DELETE` handler, asserts
 * that `getUser()` is not called inside its body. Use `requireUser()`
 * from `lib/session` instead — it queries `users` and rejects banned
 * accounts and stale sessions.
 *
 * If a write endpoint legitimately needs cookie-only auth (e.g. logout,
 * which destroys the session unconditionally), opt out with the
 * comment marker `// SAFE-GETUSER-ON-WRITE: <reason>` on the same line
 * or anywhere within the handler body.
 */

const API_ROOT = join(__dirname, '..', '..', '..', 'app', 'api')
const REPO_ROOT = join(__dirname, '..', '..', '..', '..')
const WRITE_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'] as const

interface HandlerScan {
  file: string
  method: string
  body: string
  startLine: number
}

function getHandlers(source: string): HandlerScan[] {
  const handlers: HandlerScan[] = []
  // Split file into top-level export blocks. Each `\nexport ` (or start
  // of file) begins a new block; the previous block ends right before
  // it. This is reliable because the codebase consistently writes
  // route handlers as top-level `export async function METHOD(...)`.
  const exportSplit = source.split(/(?=^export\s)/m)
  let cursor = 0
  for (const block of exportSplit) {
    const startOffset = cursor
    cursor += block.length
    const m = /^export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/.exec(block)
    if (!m) continue
    const startLine = source.slice(0, startOffset).split('\n').length
    handlers.push({ file: '', method: m[1], body: block, startLine })
  }
  return handlers
}

describe('getUser() must not appear inside POST/PATCH/PUT/DELETE handlers (audit-v4 CRIT-2 guard)', () => {
  const files = findRouteFiles(API_ROOT)

  it('finds at least one route file (sanity check)', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const filePath of files) {
    const rel = relative(REPO_ROOT, filePath).replace(/\\/g, '/')
    const source = readFileSync(filePath, 'utf8')
    const handlers = getHandlers(source).filter(h => WRITE_METHODS.includes(h.method as (typeof WRITE_METHODS)[number]))
    if (handlers.length === 0) continue

    for (const h of handlers) {
      it(`${rel} → ${h.method} does not call getUser()`, () => {
        const optOut = /\/\/\s*SAFE-GETUSER-ON-WRITE:/.test(h.body)
        if (optOut) return
        // Match `getUser(` as a function call. Allow it inside import
        // statements (callers bringing the symbol in for read paths
        // elsewhere in the file) — those start with `import`.
        const lines = h.body.split('\n')
        const offending = lines
          .map((line, i) => ({ line, i }))
          .filter(({ line }) => /\bgetUser\s*\(/.test(line))
          .filter(({ line }) => !/^\s*import\b/.test(line))
        expect(
          offending,
          offending.length
            ? `${rel}:${h.startLine + offending[0].i} — getUser() inside ${h.method}. Use requireUser() (DB-backed, ban-checked) or opt out with "// SAFE-GETUSER-ON-WRITE: <reason>".`
            : '',
        ).toEqual([])
      })
    }
  }
})
