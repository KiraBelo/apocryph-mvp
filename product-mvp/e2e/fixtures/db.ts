import { execSync } from 'node:child_process'

/**
 * Resets the test database to a clean state (schema + seed).
 * Call from globalSetup or per-describe beforeAll when isolation is needed.
 */
export function resetTestDb() {
  execSync('bash scripts/setup-test-db.sh', { stdio: 'inherit' })
}
