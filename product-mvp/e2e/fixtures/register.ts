import type { APIRequestContext, BrowserContext } from '@playwright/test'

export interface FreshUser {
  email: string
  password: string
}

/**
 * Registers a unique user via /api/auth/register.
 * Returns credentials so the caller can later loginAs / re-login.
 *
 * Uses the API (not the form) — faster and not coupled to register-page UI.
 * The session cookie is stored in the passed BrowserContext so subsequent
 * page.goto() calls in that context start authenticated.
 */
export async function registerFreshUser(
  ctxOrRequest: BrowserContext | APIRequestContext,
  prefix = 'e2e',
): Promise<FreshUser> {
  const email = `${prefix}-${crypto.randomUUID().slice(0, 8)}@apocryph.test`
  const password = 'e2e-password-000'
  const request = 'request' in ctxOrRequest ? ctxOrRequest.request : ctxOrRequest
  const res = await request.post('/api/auth/register', {
    data: { email, password },
  })
  if (!res.ok()) {
    throw new Error(`registerFreshUser failed: ${res.status()} ${await res.text()}`)
  }
  return { email, password }
}
