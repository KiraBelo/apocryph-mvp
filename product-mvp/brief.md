# Brief: Rate-limit middleware + API tests + Error logging
Date: 2026-03-17

## Task
Implement three priority items from BETA-PLAN:
1. Global rate-limit middleware (src/middleware.ts)
2. Tests for three API routes (requests POST, messages POST, admin/users GET)
3. Server-side error logging in all API routes

## Stack
- Next.js 16 App Router, TypeScript 5 strict
- PostgreSQL raw SQL via lib/db.ts: query, queryOne, withTransaction
- iron-session via lib/session.ts: getUser, requireUser, requireMod
- vitest (NOT Jest - use vi.mock, vi.fn, beforeEach)
- Rate-limit: src/lib/rate-limit.ts - rateLimit(key, maxAttempts, windowMs) returns {allowed, remaining}
- Sanitize: src/lib/sanitize.ts - sanitizeBody(html)
- Stop-list: src/lib/stoplist.ts - getActiveStopPhrases(), checkStopList(content, phrases), VIOLATION_THRESHOLD

## Key Files
- src/lib/rate-limit.ts - in-memory rate limiter using globalThis.__rateLimitStore (Map)
- src/lib/session.ts - requireUser() returns {error: 'unauthorized'|'banned'|null, user}, requireMod() returns {error: 'unauthorized'|'forbidden'|'banned'|null, user}
- src/app/api/requests/route.ts - POST create request (185 lines)
- src/app/api/games/[id]/messages/route.ts - POST send message (lines 112-188)
- src/app/api/admin/users/route.ts - GET user list (35 lines)
- src/app/api/games/[id]/messages/stream/route.ts - SSE stream (DO NOT intercept in middleware!)
- src/app/api/__tests__/auth.test.ts - EXAMPLE of existing tests (mocking pattern)
- src/test/setup.ts - test environment (SESSION_SECRET, rate-limit store reset)

## IMPORTANT: Test Mocking Pattern
See src/app/api/__tests__/auth.test.ts as example:

vi.mock('@/lib/db', () => ({ query: vi.fn(), queryOne: vi.fn(), withTransaction: vi.fn() }))
vi.mock('@/lib/session', () => ({
  requireUser: vi.fn().mockResolvedValue({ error: null, user: { id: 'user-id', email: 'a@b.com', role: 'user' }, banReason: null }),
  requireMod: vi.fn().mockResolvedValue({ error: 'forbidden', user: null }),
  getUser: vi.fn().mockResolvedValue(null),
}))
// IMPORTANT: vi.mock BEFORE imports
// IMPORTANT: reset rate-limit store IN beforeEach:
beforeEach(() => {
  const g = globalThis as unknown as { __rateLimitStore?: Map<string, unknown> }
  g.__rateLimitStore?.clear()
  vi.clearAllMocks()
})

## Route Logic for Testing

### POST /api/requests (src/app/api/requests/route.ts)
Order of checks:
1. requireUser() - 401 if unauthorized, 403 if banned
2. req.json() - request body
3. Validation: !title || !type || !content_level -> 400 {error: 'fillRequired'}
4. title.length > 200 -> 400 {error: 'titleTooLong'}
5. description.length > 200_000 -> 400 {error: 'bodyTooLong'}
6. tags > 20 or tag > 50 chars -> 400 {error: 'tooManyTags'}
7. Anti-spam: queryOne COUNT(requests in 1 day) >= 5 -> 429 {error: 'requestLimitReached'}
8. Anti-spam: queryOne lastRequest (created_at < 2 min ago) -> 429 {error: 'requestCooldown'}
9. Anti-spam: queryOne duplicate (similarity > 0.7) -> 409 {error: 'duplicateRequest'}
10. withTransaction -> INSERT -> 201 with created request

### POST /api/games/[id]/messages (src/app/api/games/[id]/messages/route.ts)
Order of checks:
1. requireUser() -> 401/403
2. queryOne game (moderation_status, status) - game.moderation_status !== 'visible' -> 403 {error: 'gameFrozen'}
3. req.json() - content, type (ic/ooc)
4. !content?.trim() -> 400 {error: 'emptyMessage'}
5. content.length > 200_000 -> 400 {error: 'messageTooLong'}
6. game.status === 'finished' && msgType === 'ic' -> 403 {error: 'gameFinished'}
7. getActiveStopPhrases() + checkStopList() -> match -> 422 {error: 'stopListBlocked'}
8. queryOne participant (left_at IS NULL) - no participant -> 403 {error: 'notParticipant'}
9. queryOne INSERT message + queryOne full message JOIN -> 201

### GET /api/admin/users (src/app/api/admin/users/route.ts)
1. requireMod() -> 401 unauthorized, 403 forbidden
2. query users (with pagination) -> 200 {users, total, page}

## Constraints
- withTransaction mocked as: vi.fn().mockResolvedValue(mockResult) for success, or vi.fn().mockRejectedValue(err) for error
- SSE stream route /api/games/[id]/messages/stream MUST NOT be blocked in middleware
- Middleware in Next.js runs on Edge Runtime - DO NOT import lib/rate-limit.ts (different context). Implement logic directly in middleware.ts with own globalThis store
- Tests: vitest only, not jest

## Success Criteria
- src/middleware.ts created, rate-limit works per IP for all /api/* routes except SSE stream
- Tests for requests POST, messages POST, admin/users GET written and passing
- Error logging added to catch blocks in API routes (only 500 errors, not 400)
- All 108+ tests pass after changes

## Tasks

### TASK #1: src/middleware.ts - global rate-limit per IP
Description: Create src/middleware.ts. Rate-limit applies to all /api/* routes.
- Limits: GET 100 req/min per IP, POST 30 req/min per IP
- For /api/games/*/messages (exact path, NOT /stream) - additional 20/min POST
- On limit exceeded: return NextResponse.json({ error: 'tooManyRequests' }, { status: 429 })
- IP: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
- Store state in own global Map (do NOT import rate-limit.ts - different runtime)
- Exclude from middleware: /api/games/*/messages/stream and static files (_next/, favicon etc)
- Add: export const config = { matcher: ['/api/:path*'] } and check manually for stream path inside middleware
Files: src/middleware.ts (new)
Depends on: nothing

### TASK #2: Tests for api/requests POST
Description: Create src/app/api/__tests__/requests.test.ts
Required cases:
- 401: requireUser returns { error: 'unauthorized' }
- 400: no title -> { error: 'fillRequired' }
- 400: no type -> { error: 'fillRequired' }
- 400: title.length > 200 -> { error: 'titleTooLong' }
- 400: description.length > 200_000 -> { error: 'bodyTooLong' }
- 400: tags.length > 20 -> { error: 'tooManyTags' }
- 429: queryOne(COUNT) returns count='5' -> { error: 'requestLimitReached' }
- 429: queryOne(last) returns created_at = new Date().toISOString() (just now) -> { error: 'requestCooldown' }
- 409: queryOne(duplicate) returns { id: 'dup-id' } -> { error: 'duplicateRequest' }
- 201: withTransaction.mockResolvedValue({ id: 'new-id', title: 'Test', ... }) -> status 201
withTransaction mock pattern: vi.fn().mockResolvedValue(requestRow) for success
Mock: @/lib/db, @/lib/session (requireUser), @/lib/sanitize
Files: src/app/api/__tests__/requests.test.ts (new)
Depends on: nothing

### TASK #3: Tests for api/games/[id]/messages POST
Description: Create src/app/api/__tests__/messages.test.ts
Required cases:
- 401: requireUser -> unauthorized
- 403: requireUser -> banned
- 403: gameFrozen - queryOne(game) returns { moderation_status: 'hidden', status: 'active' }
- 400: emptyMessage - content = '' or '   '
- 400: messageTooLong - content = 'x'.repeat(200_001)
- 403: gameFinished - game = { moderation_status: 'visible', status: 'finished' }, type = 'ic'
- 422: stopListBlocked - mock getActiveStopPhrases returns [{ id: 1, phrase: 'badword' }], checkStopList returns match object
- 403: notParticipant - queryOne(participant) returns null
- 201: all checks pass - queryOne(participant) = { id: 'p-id', left_at: null }, returns created message
Mock: @/lib/db, @/lib/session (requireUser), @/lib/stoplist (getActiveStopPhrases, checkStopList, VIOLATION_THRESHOLD)
IMPORTANT: queryOne is called in ORDER - first call is game, then participant (after stop-list), then INSERT, then full join.
Use mockResolvedValueOnce for each sequential call.
Files: src/app/api/__tests__/messages.test.ts (new)
Depends on: nothing

### TASK #4: Tests for api/admin/users GET
Description: Create src/app/api/__tests__/admin-users.test.ts
Required cases:
- 401: requireMod returns { error: 'unauthorized', user: null }
- 403: requireMod returns { error: 'forbidden', user: null }
- 200: requireMod returns { error: null, user: { role: 'moderator' } }, query returns [{ id, email, role, ... }], response has { users: [...], total: N, page: 1 }
- 200: role = 'admin' also passes
Mock: @/lib/db (query), @/lib/session (requireMod)
Files: src/app/api/__tests__/admin-users.test.ts (new)
Depends on: nothing

### TASK #5: Error logging in API routes
Description: Add console.error with context to catch blocks in all API routes.
Rule: log ONLY unexpected errors (500). Do NOT log expected errors (validation, duplicates, auth).
In src/app/api/requests/route.ts and src/app/api/games/[id]/messages/route.ts there is no try/catch - DB errors will crash unhandled. Wrap main logic (after auth checks) in try/catch:

} catch (error) {
  console.error('[API /api/requests] POST:', error)
  return NextResponse.json({ error: 'serverError' }, { status: 500 })
}

In auth routes (register, login): catch block for duplicate email should NOT log (expected), but other errors should log.
Go through all src/app/api/**/*.ts and add logging where missing.
Files: all src/app/api/**/*.ts that need error handling
Depends on: nothing
