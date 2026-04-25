import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  session.destroy()
  await session.save()
  // CORRECTNESS (CRIT-4, audit-v4): use the incoming request URL as base so
  // the redirect lands on the actual host/protocol the user came from.
  // Hard-coding NEXT_PUBLIC_BASE_URL || 'http://localhost:3000' meant a
  // production logout would redirect users to localhost when the env var
  // was not set on the server.
  return NextResponse.redirect(new URL('/', req.url))
}
