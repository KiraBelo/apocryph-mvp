import { NextRequest, NextResponse } from 'next/server'
import { requireUser, handleAuthError } from '@/lib/session'
import pool from '@/lib/db'

// DELETE /api/blacklist/[tag] — убрать тег из чёрного списка
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  // Write endpoint — requireUser checks ban + session_version (CRIT-2 guard).
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  const { tag } = await params
  try {
    await pool.query(
      'DELETE FROM user_tag_blacklist WHERE user_id = $1 AND tag = $2',
      [user.id, decodeURIComponent(tag)]
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/blacklist/[tag]] DELETE:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
