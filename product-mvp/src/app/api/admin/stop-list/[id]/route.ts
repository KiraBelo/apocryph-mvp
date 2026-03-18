import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireMod } from '@/lib/session'
import { invalidateStopPhraseCache } from '@/lib/stoplist'

// PATCH /api/admin/stop-list/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireMod()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'forbidden') return NextResponse.json({ error }, { status: 403 })
  if (error === 'banned') return NextResponse.json({ error }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const sets: string[] = []
  const vals: unknown[] = []
  let idx = 1

  if (body.phrase !== undefined) {
    const cleaned = body.phrase.trim().toLowerCase()
    if (cleaned.length < 3) return NextResponse.json({ error: 'phraseTooShort' }, { status: 400 })
    sets.push(`phrase = $${idx++}`)
    vals.push(cleaned)
  }
  if (body.note !== undefined) {
    sets.push(`note = $${idx++}`)
    vals.push(body.note?.trim() || null)
  }
  if (body.is_active !== undefined) {
    sets.push(`is_active = $${idx++}`)
    vals.push(!!body.is_active)
  }

  if (sets.length === 0) return NextResponse.json({ error: 'noChanges' }, { status: 400 })

  try {
    const existing = await queryOne('SELECT id FROM stop_phrases WHERE id = $1', [id])
    if (!existing) return NextResponse.json({ error: 'notFound' }, { status: 404 })

    vals.push(id)
    const row = await queryOne(
      `UPDATE stop_phrases SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    )

    invalidateStopPhraseCache()
    return NextResponse.json({ phrase: row })
  } catch (error) {
    console.error('[API /api/admin/stop-list/[id]] PATCH:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// DELETE /api/admin/stop-list/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireMod()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'forbidden') return NextResponse.json({ error }, { status: 403 })
  if (error === 'banned') return NextResponse.json({ error }, { status: 403 })

  const { id } = await params
  try {
    await query('DELETE FROM stop_phrases WHERE id = $1', [id])
    invalidateStopPhraseCache()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/admin/stop-list/[id]] DELETE:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
