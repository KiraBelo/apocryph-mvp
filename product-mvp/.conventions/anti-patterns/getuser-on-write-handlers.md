# `getUser()` inside write handlers — anti-pattern

## Rule

Inside `POST | PATCH | PUT | DELETE` handlers in `src/app/api/**/route.ts`,
**never call `getUser()`**. Use `requireUser()` from `@/lib/session` instead.

A regression test in [`src/app/api/__tests__/no-getuser-on-writes.test.ts`](../../src/app/api/__tests__/no-getuser-on-writes.test.ts)
enforces this rule across the whole `app/api/` tree on every commit.

## Why

| | `getUser()` | `requireUser()` |
|--|--|--|
| Reads cookie | ✅ | ✅ |
| Queries `users` table | ❌ | ✅ |
| Rejects banned accounts (`banned_at IS NOT NULL`) | ❌ | ✅ |
| Rejects stale sessions (post-password-change) | ❌ | ✅ |

`getUser()` is fast — it only decodes the iron-session cookie. That is fine
on read endpoints (worst case: a banned user sees their own data). But on
write endpoints it lets a banned account keep editing, commenting,
liking, creating tags, etc. — exactly the bug audit-v4 CRIT-2 caught in
4 places (likes POST, comments POST, notes PATCH/DELETE).

A second sweep during the regression-guard PR found 6 more violations
that CRIT-2 had missed: `blacklist` POST/DELETE, `blacklist/[tag]` DELETE,
`bookmarks/[id]` POST/DELETE, `tags` POST.

## Pattern

```ts
// Read endpoint — getUser is fine
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  // ...
}

// Write endpoint — requireUser is mandatory
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth
  // ...
}
```

## Escape hatch

If a write endpoint genuinely needs cookie-only auth (the canonical
example is `logout`, which destroys the session unconditionally), opt out
by adding the marker comment anywhere inside the handler body:

```ts
export async function POST(req: NextRequest) {
  // SAFE-GETUSER-ON-WRITE: logout destroys the session unconditionally,
  // checking ban status would only let banned users get stuck logged in.
  const user = await getUser()
  // ...
}
```

The regression test honours this marker. Use it sparingly — every
opt-out is an audit risk.

## See also

- [`src/lib/session.ts`](../../src/lib/session.ts) — `requireUser` /
  `requireMod` / `handleAuthError` implementation.
- audit-v4 CRIT-2 (commit `aaed315`) — original sweep across the four
  public-library write endpoints.
