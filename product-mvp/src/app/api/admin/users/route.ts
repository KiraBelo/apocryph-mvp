import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireMod, handleAuthError } from '@/lib/session'

// GET /api/admin/users?q=email&page=1
export async function GET(req: NextRequest) {
  const { error } = await requireMod()
  const authErr = handleAuthError(error)
  if (authErr) return authErr

  const sp = req.nextUrl.searchParams
  const q = sp.get('q') || ''
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  const escapedQ = q.replace(/[%_\\]/g, '\\$&')

  try {
    const users = await query<{ _total: string }>(
      `SELECT id, email, role, banned_at, ban_reason, created_at,
              COUNT(*) OVER() as _total
       FROM users
       WHERE email ILIKE '%' || $1 || '%'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [escapedQ, limit, offset]
    )
    const total = users.length > 0 ? parseInt(users[0]._total) : 0
    const safeUsers = users.map(({ _total, ...rest }) => rest)

    return NextResponse.json({ users: safeUsers, total, page })
  } catch (error) {
    console.error('[API /api/admin/users] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
