import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireMod } from '@/lib/session'

// PATCH /api/admin/users/[id] — ban, unban, set_role
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireMod()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error }, { status: 403 })
  if (error === 'forbidden') return NextResponse.json({ error }, { status: 403 })

  const { id: targetId } = await params

  // Cannot modify yourself
  if (targetId === user!.id) {
    return NextResponse.json({ error: 'cannotModifySelf' }, { status: 400 })
  }
  const { action, reason, role: newRole } = await req.json()

  // Get target user info for hierarchy checks
  const target = await queryOne<{ role: string }>(
    'SELECT role FROM users WHERE id = $1', [targetId]
  )
  if (!target) return NextResponse.json({ error: 'notFound' }, { status: 404 })

  // Role hierarchy: moderator cannot ban/modify moderator or admin
  const roleLevel = (r: string) => r === 'admin' ? 3 : r === 'moderator' ? 2 : 1
  if (user!.role !== 'admin' && roleLevel(target.role) >= roleLevel(user!.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (action === 'ban') {
    if (!reason || reason.length > 500) {
      return NextResponse.json({ error: 'invalidReason' }, { status: 400 })
    }
    await query(
      'UPDATE users SET banned_at = NOW(), ban_reason = $2 WHERE id = $1',
      [targetId, reason]
    )
    return NextResponse.json({ ok: true })
  }

  if (action === 'unban') {
    await query(
      'UPDATE users SET banned_at = NULL, ban_reason = NULL WHERE id = $1',
      [targetId]
    )
    return NextResponse.json({ ok: true })
  }

  if (action === 'set_role') {
    // Only admin can change roles
    if (user!.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    if (!newRole || !['user', 'moderator', 'admin'].includes(newRole)) {
      return NextResponse.json({ error: 'invalidRole' }, { status: 400 })
    }
    await query('UPDATE users SET role = $2 WHERE id = $1', [targetId, newRole])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'invalidAction' }, { status: 400 })
}
