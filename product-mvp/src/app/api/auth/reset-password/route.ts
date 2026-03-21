import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryOne, query } from '@/lib/db'

export async function POST(req: NextRequest) {
  let token: string, password: string
  try {
    ({ token, password } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  if (!token || !password || typeof token !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'passwordTooShort' }, { status: 400 })
  }

  if (password.length > 128) {
    return NextResponse.json({ error: 'dataTooLong' }, { status: 400 })
  }

  try {
    const row = await queryOne<{ id: string; user_id: string; expires_at: string }>(
      'SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token = $1',
      [token]
    )

    if (!row) {
      return NextResponse.json({ error: 'resetExpired' }, { status: 400 })
    }

    if (new Date(row.expires_at) < new Date()) {
      await query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id])
      return NextResponse.json({ error: 'resetExpired' }, { status: 400 })
    }

    const hash = await bcrypt.hash(password, 10)
    await query(
      'UPDATE users SET password_hash = $1, session_version = session_version + 1 WHERE id = $2',
      [hash, row.user_id]
    )
    await query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id])

    // Update current session with new version so this session stays valid
    const { getSession } = await import('@/lib/session')
    const session = await getSession()
    if (session.userId === row.user_id) {
      const updated = await queryOne<{ session_version: number }>(
        'SELECT session_version FROM users WHERE id = $1', [row.user_id]
      )
      if (updated) {
        session.sessionVersion = updated.session_version
        await session.save()
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/auth/reset-password] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
