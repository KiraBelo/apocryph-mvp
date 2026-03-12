import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireMod } from '@/lib/session'

// PATCH /api/admin/games/[id] — change moderation_status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireMod()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'forbidden') return NextResponse.json({ error }, { status: 403 })

  const { id: gameId } = await params
  const { moderation_status } = await req.json()

  if (!moderation_status || !['visible', 'hidden', 'under_review'].includes(moderation_status)) {
    return NextResponse.json({ error: 'invalidStatus' }, { status: 400 })
  }

  await query('UPDATE games SET moderation_status = $2 WHERE id = $1', [gameId, moderation_status])

  return NextResponse.json({ ok: true })
}
