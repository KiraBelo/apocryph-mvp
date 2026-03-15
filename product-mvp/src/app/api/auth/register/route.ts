import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  let email: string, password: string
  try {
    ({ email, password } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
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
  } catch {
    return NextResponse.json({ error: 'emailTaken' }, { status: 409 })
  }
}
