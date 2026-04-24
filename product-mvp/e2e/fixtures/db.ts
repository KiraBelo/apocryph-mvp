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
 * Inserts N IC messages from a participant into a game directly via SQL.
 * Bypasses the messages POST rate limit (30/min) so seed counts up to
 * MIN_IC_POSTS in a single go for publish/moderation E2E tests.
 */
export async function seedIcMessages(
  gameId: string,
  participantId: string,
  count: number,
  prefix = 'seed',
): Promise<void> {
  const db = testDbPool()
  for (let i = 0; i < count; i++) {
    await db.query(
      `INSERT INTO messages (game_id, participant_id, content, type)
       VALUES ($1, $2, $3, 'ic')`,
      [gameId, participantId, `<p>${prefix} ic ${i + 1}</p>`],
    )
  }
}

/**
 * Returns participant_id rows for a game, in join order.
 * Useful when seeding messages or asserting participant state.
 */
export async function listGameParticipants(gameId: string) {
  const db = testDbPool()
  const { rows } = await db.query<{ id: string; user_id: string; nickname: string }>(
    'SELECT id, user_id, nickname FROM game_participants WHERE game_id = $1 ORDER BY joined_at',
    [gameId],
  )
  return rows
}

/**
 * Reads the current games row (status / moderation_status).
 */
export async function getGameStatus(gameId: string) {
  const db = testDbPool()
  const { rows } = await db.query<{ status: string; moderation_status: string }>(
    'SELECT status, moderation_status FROM games WHERE id = $1',
    [gameId],
  )
  return rows[0] ?? null
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
