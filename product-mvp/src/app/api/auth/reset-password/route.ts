import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryOne, withTransaction } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'

export async function POST(req: NextRequest) {
  // Rate-limit по IP: перебор одноразовых токенов не опасен (128 бит энтропии),
  // но защита от DoS и замедление нецелевого brute-force.
  const ip = getClientIp(req.headers)
  const { allowed } = rateLimit(`reset-password:${ip}`, 10, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'errors.tooManyRequests' }, { status: 429 })
  }

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
    const hash = await bcrypt.hash(password, 10)

    // Атомарность: DELETE токена → UPDATE пароля в одной транзакции.
    // DELETE ... RETURNING гарантирует что только один параллельный запрос
    // реально получит строку — остальные увидят пустой результат.
    const result = await withTransaction(async (client) => {
      const deleted = await client.query<{ user_id: string; expires_at: string }>(
        'DELETE FROM password_reset_tokens WHERE token = $1 RETURNING user_id, expires_at',
        [token]
      )
      const row = deleted.rows[0]
      if (!row) return { error: 'resetExpired' as const }

      if (new Date(row.expires_at) < new Date()) {
        return { error: 'resetExpired' as const }
      }

      await client.query(
        'UPDATE users SET password_hash = $1, session_version = session_version + 1 WHERE id = $2',
        [hash, row.user_id]
      )

      const updated = await client.query<{ session_version: number }>(
        'SELECT session_version FROM users WHERE id = $1', [row.user_id]
      )
      return { userId: row.user_id, sessionVersion: updated.rows[0]?.session_version }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Update current session with new version so this session stays valid
    const { getSession } = await import('@/lib/session')
    const session = await getSession()
    if (session.userId === result.userId && result.sessionVersion !== undefined) {
      session.sessionVersion = result.sessionVersion
      await session.save()
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/auth/reset-password] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
