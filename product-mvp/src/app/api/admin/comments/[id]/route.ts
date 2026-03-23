import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'

// POST — approve comment
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  const authErr = handleAuthError(error)
  if (authErr) return authErr
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id: commentId } = await params

  try {
    const updated = await queryOne(
      "UPDATE game_comments SET approved_at=NOW() WHERE id=$1 RETURNING id",
      [commentId]
    )
    if (!updated) return NextResponse.json({ error: 'notFound' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/admin/comments/[id]] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// DELETE — remove comment
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  const authErr = handleAuthError(error)
  if (authErr) return authErr
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id: commentId } = await params

  try {
    await queryOne('DELETE FROM game_comments WHERE id=$1', [commentId])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/admin/comments/[id]] DELETE:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
