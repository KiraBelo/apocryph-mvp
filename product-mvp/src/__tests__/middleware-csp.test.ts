import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

// HIGH-S1 (audit-v4): the CSP `script-src` directive previously included
// `https:`, which trusted ANY https origin and bypassed the script
// allowlist on legacy browsers. The fix removes it. This test pins the
// CSP shape so the directive cannot creep back unnoticed.

function getScriptSrc(req: NextRequest): string {
  const res = middleware(req)
  const csp = res.headers.get('Content-Security-Policy') ?? ''
  const directive = csp.split(';').map(s => s.trim()).find(d => d.startsWith('script-src'))
  return directive ?? ''
}

describe('middleware CSP (HIGH-S1 regression)', () => {
  it('script-src does not include the bare `https:` source', () => {
    const req = new NextRequest('http://localhost/')
    const scriptSrc = getScriptSrc(req)

    expect(scriptSrc).toMatch(/^script-src\b/)
    // Allow https://specific.host but reject the bare `https:` token.
    expect(scriptSrc).not.toMatch(/(?:^|\s)https:(?:\s|$)/)
  })

  it('script-src still has nonce + strict-dynamic for modern browsers', () => {
    const req = new NextRequest('http://localhost/')
    const scriptSrc = getScriptSrc(req)
    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/)
    expect(scriptSrc).toContain("'self'")
  })
})
