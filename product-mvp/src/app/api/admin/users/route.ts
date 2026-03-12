import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireMod } from '@/lib/session'

// GET /api/admin/users?q=email&page=1
export async function GET(req: NextRequest) {
  const { error } = await requireMod()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'forbidden') return NextResponse.json({ error }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const q = sp.get('q') || ''
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const limit = 50
  const offset = (page - 1) * limit

  const escapedQ = q.replace(/[%_\\]/g, '\\$&')

  const users = await query(
    `SELECT id, email, role, banned_at, ban_reason, created_at
     FROM users
     WHERE email ILIKE '%' || $1 || '%'
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [escapedQ, limit, offset]
  )

  const countRow = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM users WHERE email ILIKE '%' || $1 || '%'`,
    [escapedQ]
  )
  const total = parseInt(countRow[0]?.cnt || '0')

  return NextResponse.json({ users, total, page })
}
