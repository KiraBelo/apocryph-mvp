import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? 'postgresql://postgres:postgres@localhost:5432/apocryph_test',
      SESSION_SECRET: 'test-secret-key-at-least-32-characters-long',
      TRUSTED_PROXY: '1',
      // E2E bursts many registrations/logins from one IP — this flag tells
      // src/lib/rate-limit.ts to short-circuit. Never set outside E2E.
      APOCRIPH_DISABLE_RATE_LIMIT: '1',
    },
  },
})
