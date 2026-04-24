import { execSync } from 'node:child_process'
import { Pool } from 'pg'

/**
 * Resets the test database to a clean state (schema + seed).
 * Mostly used via globalSetup — left here as a per-suite escape hatch.
 */
export function resetTestDb() {
  execSync('bash scripts/setup-test-db.sh', { stdio: 'inherit' })
}

/**
 * Canonical URL of the test database. Prefers DATABASE_URL_TEST, falls back
 * to the localhost default used in playwright.config.ts webServer.env.
 */
export function testDbUrl() {
  return (
    process.env.DATABASE_URL_TEST ??
    'postgresql://postgres:postgres@localhost:5432/apocryph_test'
  )
}

let pool: Pool | null = null

/**
 * Lazily-created pg Pool for E2E DB access (seeding helpers, assertions).
 * Tests that modify rows must live under the `apocryph_test` DB — the URL
 * guard in globalSetup keeps us from touching anything else.
 */
export function testDbPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: testDbUrl() })
  return pool
}

/**
 * Inserts a row into password_reset_tokens that is valid for the next hour.
 * Used by the reset-password E2E since the forgot-password endpoint is a
 * 501 stub (no email sending).
 */
export async function insertResetToken(userId: string, token: string) {
  const db = testDbPool()
  const expires = new Date(Date.now() + 60 * 60 * 1000)
  await db.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expires.toISOString()],
  )
}

/**
 * Looks up a user's id by email. Returns null if absent.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const db = testDbPool()
  const { rows } = await db.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [email],
  )
  return rows[0]?.id ?? null
}
