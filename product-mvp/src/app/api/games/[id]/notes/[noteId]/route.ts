import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'

// PATCH — обновить заметку
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  const { id: gameId, noteId } = await params
  const { title, content } = await req.json()

  if (title && title.length > 200) {
    return NextResponse.json({ error: 'Заголовок заметки не может быть длиннее 200 символов' }, { status: 400 })
  }
  if (content && content.length > 200_000) {
    return NextResponse.json({ error: 'Заметка слишком длинная' }, { status: 400 })
  }

  const note = await queryOne<{ id: number; title: string; content: string; created_at: string; updated_at: string }>(
    'UPDATE game_notes SET title=$3, content=$4, updated_at=NOW() WHERE id=$1 AND game_id=$2 AND user_id=$5 RETURNING id, title, content, created_at, updated_at',
    [noteId, gameId, title ?? '', content ?? '', user.id]
  )
  if (!note) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
  return NextResponse.json({ note })
}

// DELETE — удалить заметку
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  const { id: gameId, noteId } = await params

  await query(
    'DELETE FROM game_notes WHERE id=$1 AND game_id=$2 AND user_id=$3',
    [noteId, gameId, user.id]
  )
  return NextResponse.json({ ok: true })
}
