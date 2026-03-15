import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/auth'
import { getSession } from '@/lib/session'
import type { Role } from '@/lib/session'

export async function POST(req: NextRequest) {
  let email: string, password: string
  try {
    ({ email, password } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  const user = await verifyUser(email, password)
  if (!user) {
    return NextResponse.json({ error: 'wrongCredentials' }, { status: 401 })
  }

  // verifyUser returns SELECT * — includes role, banned_at, ban_reason after migration
  const u = user as unknown as Record<string, unknown>
  if (u.banned_at) {
    return NextResponse.json({ error: 'banned', reason: u.ban_reason || null }, { status: 403 })
  }

  const session = await getSession()
  session.userId = user.id
  session.email = user.email
  session.role = (u.role as Role) || 'user'
  await session.save()

  return NextResponse.json({ ok: true })
}
