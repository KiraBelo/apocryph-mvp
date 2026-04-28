import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'

// POST — добавить в закладки
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Write endpoint — requireUser checks ban + session_version (CRIT-2 guard).
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  const { id: requestId } = await params

  try {
    // Atomic count + insert in transaction to prevent TOCTOU race
    const result = await withTransaction(async (client) => {
      const countRes = await client.query(
        'SELECT COUNT(*) as count FROM bookmarks WHERE user_id=$1', [user.id]
      )
      if (parseInt(countRes.rows[0].count) >= 50) {
        return { error: 'limitReached' }
      }
      await client.query(
        'INSERT INTO bookmarks (user_id, request_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [user.id, requestId]
      )
      return { ok: true }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/bookmarks/[id]] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// DELETE — удалить из закладок
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  const { id: requestId } = await params
  try {
    await query('DELETE FROM bookmarks WHERE user_id=$1 AND request_id=$2', [user.id, requestId])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/bookmarks/[id]] DELETE:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
