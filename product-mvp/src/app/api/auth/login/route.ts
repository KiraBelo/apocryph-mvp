import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/auth'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const user = await verifyUser(email, password)
  if (!user) {
    return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
  }

  const session = await getSession()
  session.userId = user.id
  session.email = user.email
  await session.save()

  return NextResponse.json({ ok: true })
}
