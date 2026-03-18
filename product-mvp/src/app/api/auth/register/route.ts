import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'
import { getSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  let email: string, password: string
  try {
    ({ email, password } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed } = rateLimit(`register:${ip}`, 3, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'tooManyAttempts' }, { status: 429 })
  }

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }
  // Basic email format validation
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRe.test(email)) {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }
  if (email.length > 255 || password.length > 128) {
    return NextResponse.json({ error: 'dataTooLong' }, { status: 400 })
  }

  try {
    const user = await createUser(email, password)
    const session = await getSession()
    session.userId = user.id
    session.email = user.email
    session.role = 'user'
    await session.save()
    return NextResponse.json({ ok: true })
  } catch (error) {
    // Expected: duplicate email constraint
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'emailTaken' }, { status: 409 })
    }
    // Unexpected: log and return 500
    console.error('[API /api/auth/register] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
