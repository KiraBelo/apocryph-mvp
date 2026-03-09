import bcrypt from 'bcryptjs'
import { query, queryOne } from './db'

export interface User {
  id: string
  email: string
  password_hash: string
  created_at: string
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
