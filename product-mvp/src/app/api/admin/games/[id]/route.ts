import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireMod, handleAuthError } from '@/lib/session'

// PATCH /api/admin/games/[id] — change moderation_status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMod()
  if (auth.error) return handleAuthError(auth.error)

  const { id: gameId } = await params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }
  const { moderation_status } = body

  if (!moderation_status || !['visible', 'hidden', 'under_review'].includes(moderation_status)) {
    return NextResponse.json({ error: 'invalidStatus' }, { status: 400 })
  }

  try {
    const updated = await query<{ id: string }>(
      'UPDATE games SET moderation_status = $2 WHERE id = $1 RETURNING id',
      [gameId, moderation_status]
    )
    if (updated.length === 0) {
      return NextResponse.json({ error: 'notFound' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/admin/games/[id]] PATCH:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
