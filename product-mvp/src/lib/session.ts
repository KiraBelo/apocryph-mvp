import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import { queryOne } from './db'

export type Role = 'user' | 'moderator' | 'admin'

export interface SessionData {
  userId?: string
  email?: string
  role?: Role
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'apocryph_session',
  cookieOptions: {
    secure: process.env.USE_HTTPS === 'true',
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

/** For write endpoints: checks auth + ban status from DB */
export async function requireUser() {
  const user = await getUser()
  if (!user) return { error: 'unauthorized' as const, user: null, banReason: null }
  const row = await queryOne<{ banned_at: string | null; ban_reason: string | null }>(
    'SELECT banned_at, ban_reason FROM users WHERE id = $1', [user.id]
  )
  if (row?.banned_at) return { error: 'banned' as const, user: null, banReason: row.ban_reason }
  return { error: null, user, banReason: null }
}

/** For admin/mod endpoints: checks auth + role + ban from DB */
export async function requireMod() {
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
