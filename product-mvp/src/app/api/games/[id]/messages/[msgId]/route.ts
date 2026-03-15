import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { notifyGame } from '@/lib/sse'
import { sanitizeBody } from '@/lib/sanitize'

// PATCH — редактировать своё сообщение
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; msgId: string }> }) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error }, { status: 403 })

  const { id: gameId, msgId } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'emptyMessage' }, { status: 400 })
  if (content.length > 200_000) return NextResponse.json({ error: 'messageTooLong' }, { status: 400 })

  const sanitized = sanitizeBody(content)
  if (!sanitized?.trim()) return NextResponse.json({ error: 'emptyMessage' }, { status: 400 })

  // Проверяем: сообщение принадлежит текущему пользователю
  const existing = await queryOne<{ id: string; participant_id: string }>(
    `SELECT m.id, m.participant_id
     FROM messages m
     JOIN game_participants gp ON gp.id = m.participant_id
     WHERE m.id = $1 AND m.game_id = $2 AND gp.user_id = $3`,
    [msgId, gameId, user!.id]
  )
  if (!existing) return NextResponse.json({ error: 'notFound' }, { status: 404 })

  const updated = await queryOne(
    `UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2
     RETURNING id, content, edited_at`,
    [sanitized, msgId]
  )

  notifyGame(gameId, { _type: 'edit', ...(updated as object) })

  return NextResponse.json(updated)
}
