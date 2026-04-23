import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { queryOne } from './db'

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set and at least 32 characters')
}
// Placeholder-guard: не допустить деплой с дефолтным значением из .env.example.
// Знание секрета = полный захват любого аккаунта (можно подделать session cookie).
const WEAK_SECRET_MARKERS = ['change-this', 'your-secret', 'example', 'placeholder', 'random-32-char']
const secretLower = process.env.SESSION_SECRET.toLowerCase()
if (WEAK_SECRET_MARKERS.some(m => secretLower.includes(m))) {
  throw new Error(
    'SESSION_SECRET looks like a placeholder (contains "change-this"/"example"/etc). ' +
    'Generate a real random secret (openssl rand -base64 32) before running.'
  )
}

export type Role = 'user' | 'moderator' | 'admin'

export interface SessionData {
  userId?: string
  email?: string
  role?: Role
  sessionVersion?: number
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'apocryph_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production' || process.env.USE_HTTPS === 'true',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function getUser() {
  const session = await getSession()
  if (!session.userId) return null
  return { id: session.userId, email: session.email!, role: (session.role || 'user') as Role }
}

export type AuthUser = { id: string; email: string; role: Role }

/**
 * Discriminated union: when `error` is null, `user` is guaranteed non-null.
 * TypeScript narrows correctly after `if (result.error) return …`.
 */
export type AuthResult =
  | { error: null; user: AuthUser; banReason: null }
  | { error: 'unauthorized' | 'banned'; user: null; banReason: string | null }

export type ModResult =
  | { error: null; user: AuthUser }
  | { error: 'unauthorized' | 'banned' | 'forbidden'; user: null }

/** For write endpoints: checks auth + ban status + session version from DB */
export async function requireUser(): Promise<AuthResult> {
  const session = await getSession()
  if (!session.userId) return { error: 'unauthorized' as const, user: null, banReason: null }

  const row = await queryOne<{ banned_at: string | null; ban_reason: string | null; session_version: number; role: string }>(
    'SELECT banned_at, ban_reason, session_version, role FROM users WHERE id = $1', [session.userId]
  )
  if (!row) return { error: 'unauthorized' as const, user: null, banReason: null }
  if (row.banned_at) return { error: 'banned' as const, user: null, banReason: row.ban_reason }

  // Session version check: only enforce when session actually has a version
  if (session.sessionVersion && session.sessionVersion !== row.session_version) {
    session.destroy()
    await session.save()
    return { error: 'unauthorized' as const, user: null, banReason: null }
  }
  // Auto-upgrade pre-versioning sessions
  if (!session.sessionVersion) {
    session.sessionVersion = row.session_version
    await session.save()
  }

  const user = { id: session.userId, email: session.email!, role: (row.role || 'user') as Role }
  return { error: null, user, banReason: null }
}

/** For admin/mod endpoints: checks auth + role + ban from DB */
export async function requireMod(): Promise<ModResult> {
  const session = await getSession()
  if (!session.userId) return { error: 'unauthorized' as const, user: null }
  const row = await queryOne<{ role: string; banned_at: string | null }>(
    'SELECT role, banned_at FROM users WHERE id = $1', [session.userId]
  )
  if (!row) return { error: 'unauthorized' as const, user: null }
  if (row.banned_at) return { error: 'banned' as const, user: null }
  if (row.role !== 'moderator' && row.role !== 'admin') return { error: 'forbidden' as const, user: null }
  return { error: null, user: { id: session.userId, email: session.email!, role: row.role as Role } }
}

/**
 * Converts requireUser/requireMod error string to NextResponse.
 * Overloads let TypeScript narrow the return type based on the argument:
 *   - handleAuthError(null) → null (no error)
 *   - handleAuthError(someString) → NextResponse (guaranteed non-null)
 * This means call sites can do: `if (auth.error) return handleAuthError(auth.error)`
 * without needing a non-null assertion.
 */
export function handleAuthError(error: null): null
export function handleAuthError(error: string): NextResponse
export function handleAuthError(error: string | null): NextResponse | null
export function handleAuthError(error: string | null): NextResponse | null {
  if (!error) return null
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })
  if (error === 'forbidden') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  // Fallback for unknown error strings — treat as unauthorized to prevent null user access
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}
