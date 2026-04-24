import { execSync } from 'node:child_process'

/**
 * Playwright global setup — runs once before the whole suite.
 * Resets the test DB via scripts/setup-test-db.sh (DROP + schema.sql + seed-dev.sql).
 *
 * Safety: only runs if DATABASE_URL_TEST (or DATABASE_URL) points at a DB whose
 * name contains "apocryph_test". Otherwise the reset is skipped with a warning —
 * we never want to accidentally wipe a real dev DB from Playwright.
 */
export default async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL ?? ''
  if (!/apocryph_test/.test(dbUrl)) {
     
    console.warn(
      '[e2e global-setup] DATABASE_URL_TEST does not look like a test DB, skipping reset. URL:',
      dbUrl || '(empty)',
    )
    return
  }
   
  console.log('[e2e global-setup] Resetting test DB via scripts/setup-test-db.sh')
  execSync('bash scripts/setup-test-db.sh', { stdio: 'inherit' })
}
