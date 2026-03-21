import bcrypt from 'bcryptjs'
import { query, queryOne } from './db'

export interface GameParticipant {
  id: string
  game_id: string
  user_id: string
  nickname: string
  avatar_url: string | null
  banner_url: string | null
  banner_pref: 'own' | 'partner' | 'none'
  left_at: string | null
  leave_reason: string | null
}

/**
 * Check if user is a participant of a game.
 * By default excludes left participants (left_at IS NULL).
 * Pass { includeLeft: true } to include participants who have left.
 */
export async function requireParticipant(
  gameId: string,
  userId: string,
  opts?: { includeLeft?: boolean }
): Promise<GameParticipant | null> {
  const leftClause = opts?.includeLeft ? '' : 'AND left_at IS NULL'
  return queryOne<GameParticipant>(
    `SELECT * FROM game_participants WHERE game_id = $1 AND user_id = $2 ${leftClause}`,
    [gameId, userId]
  )
}

export interface User {
  id: string
  email: string
  password_hash: string
  created_at: string
  role: string
  banned_at: string | null
  ban_reason: string | null
  session_version: number
}

export async function createUser(email: string, password: string): Promise<User> {
  const hash = await bcrypt.hash(password, 10)
  const rows = await query<User>(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
    [email.toLowerCase().trim(), hash]
  )
  return rows[0]
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  )
  if (!user) return null
  const valid = await bcrypt.compare(password, user.password_hash)
  return valid ? user : null
}

export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>('SELECT * FROM users WHERE id = $1', [id])
}
