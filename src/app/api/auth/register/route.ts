import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
  }
  if (email.length > 255 || password.length > 128) {
    return NextResponse.json({ error: 'Слишком длинные данные' }, { status: 400 })
  }

  try {
    const user = await createUser(email, password)
    const session = await getSession()
    session.userId = user.id
    session.email = user.email
    await session.save()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Email уже занят' }, { status: 409 })
  }
}
