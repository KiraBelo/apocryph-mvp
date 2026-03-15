import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'
import { sanitizeBody } from '@/lib/sanitize'

// GET — загрузить все свои заметки к игре (новые сверху)
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: gameId } = await params

  const member = await queryOne('SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2', [gameId, user.id])
  if (!member) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const notes = await query<{ id: number; title: string; content: string; created_at: string; updated_at: string | null }>(
    'SELECT id, title, content, created_at, updated_at FROM game_notes WHERE game_id=$1 AND user_id=$2 ORDER BY created_at DESC',
    [gameId, user.id]
  )
  return NextResponse.json({ notes })
}

// POST — создать новую заметку
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: gameId } = await params
  const { title, content } = await req.json()

  if (title && title.length > 200) {
    return NextResponse.json({ error: 'noteTitleTooLong' }, { status: 400 })
  }
  if (content && content.length > 200_000) {
    return NextResponse.json({ error: 'noteTooLong' }, { status: 400 })
  }

  const member = await queryOne('SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2', [gameId, user.id])
  if (!member) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const note = await queryOne<{ id: number; title: string; content: string; created_at: string; updated_at: string | null }>(
    'INSERT INTO game_notes (game_id, user_id, title, content) VALUES ($1, $2, $3, $4) RETURNING id, title, content, created_at, updated_at',
    [gameId, user.id, title ?? '', sanitizeBody(content ?? '')]
  )
  return NextResponse.json({ note })
}
