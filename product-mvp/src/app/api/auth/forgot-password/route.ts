import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { queryOne, query } from '@/lib/db'
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

  try {
    const user = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()])
    if (user) {
      // Delete any existing tokens for this user
      await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id])

      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt.toISOString()]
      )

      // TODO: send email with reset link
      // await sendEmail(user.email, `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password?token=${token}`)
    }
  } catch (error) {
    console.error('[API /api/auth/forgot-password] POST:', error)
  }

  // Always return ok to not reveal if email exists
  return NextResponse.json({ ok: true })
}
