import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  let email: string
  try {
    ({ email } = await req.json())
  } catch {
    return NextResponse.json({ ok: true })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed } = rateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'tooManyAttempts' }, { status: 429 })
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ ok: true })
  }

  // Email sending not implemented — return 501 to avoid silently creating tokens in DB
  return NextResponse.json({ error: 'notImplemented' }, { status: 501 })
}
