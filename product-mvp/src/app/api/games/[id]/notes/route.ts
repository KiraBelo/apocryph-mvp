import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'
import { sanitizeBody } from '@/lib/sanitize'
import { requireParticipant } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

// GET — загрузить все свои заметки к игре (новые сверху).
// Включаем left-участников: личные заметки автора должны быть доступны
// и после выхода из игры.
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth
  const { id: gameId } = await params

  try {
    const member = await requireParticipant(gameId, user.id, { includeLeft: true })
    if (!member) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const notes = await query<{ id: number; title: string; content: string; created_at: string; updated_at: string | null }>(
      'SELECT id, title, content, created_at, updated_at FROM game_notes WHERE game_id=$1 AND user_id=$2 ORDER BY created_at DESC',
      [gameId, user.id]
    )
    // Defence in depth: повторно санитизируем контент при чтении на случай если
    // в БД попали данные до внедрения sanitizeBody (исторические записи или баг в санитайзере).
    return NextResponse.json({ notes: notes.map(n => ({ ...n, content: sanitizeBody(n.content) ?? '' })) })
  } catch (error) {
    console.error('[API /api/games/[id]/notes] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// POST — создать новую заметку
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  const { allowed } = rateLimit(`notes:${user.id}`, 20, 60_000)
  if (!allowed) return NextResponse.json({ error: 'errors.tooManyRequests' }, { status: 429 })

  const { id: gameId } = await params
  let title: string | undefined, content: string | undefined
  try {
    ({ title, content } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  if (title && title.length > 200) {
    return NextResponse.json({ error: 'noteTitleTooLong' }, { status: 400 })
  }
  if (content && content.length > 200_000) {
    return NextResponse.json({ error: 'noteTooLong' }, { status: 400 })
  }

  try {
    const member = await requireParticipant(gameId, user.id)
    if (!member) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const note = await queryOne<{ id: number; title: string; content: string; created_at: string; updated_at: string | null }>(
      'INSERT INTO game_notes (game_id, user_id, title, content) VALUES ($1, $2, $3, $4) RETURNING id, title, content, created_at, updated_at',
      [gameId, user.id, title ?? '', sanitizeBody(content ?? '')]
    )
    return NextResponse.json({ note })
  } catch (error) {
    console.error('[API /api/games/[id]/notes] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
