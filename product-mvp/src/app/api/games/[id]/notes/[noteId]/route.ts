import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'
import { sanitizeBody } from '@/lib/sanitize'

// PATCH — обновить заметку
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: gameId, noteId } = await params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }
  const { title, content } = body

  if (title && title.length > 200) {
    return NextResponse.json({ error: 'noteTitleTooLong' }, { status: 400 })
  }
  if (content && content.length > 200_000) {
    return NextResponse.json({ error: 'noteTooLong' }, { status: 400 })
  }

  try {
    const note = await queryOne<{ id: number; title: string; content: string; created_at: string; updated_at: string }>(
      'UPDATE game_notes SET title=COALESCE($3, title), content=COALESCE($4, content), updated_at=NOW() WHERE id=$1 AND game_id=$2 AND user_id=$5 RETURNING id, title, content, created_at, updated_at',
      [noteId, gameId, title ?? null, content != null ? sanitizeBody(content) : null, user.id]
    )
    if (!note) return NextResponse.json({ error: 'notFound' }, { status: 404 })
    return NextResponse.json({ note })
  } catch (error) {
    console.error('[API /api/games/[id]/notes/[noteId]] PATCH:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// DELETE — удалить заметку
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: gameId, noteId } = await params

  try {
    await query(
      'DELETE FROM game_notes WHERE id=$1 AND game_id=$2 AND user_id=$3',
      [noteId, gameId, user.id]
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/games/[id]/notes/[noteId]] DELETE:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
