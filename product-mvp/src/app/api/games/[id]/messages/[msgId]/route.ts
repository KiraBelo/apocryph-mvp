import { NextRequest, NextResponse } from 'next/server'
import { queryOne, withTransaction } from '@/lib/db'

import { requireUser, handleAuthError } from '@/lib/session'
import { notifyGame } from '@/lib/sse'
import { sanitizeBody } from '@/lib/sanitize'

// PATCH — редактировать своё сообщение
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; msgId: string }> }) {
  const { error, user } = await requireUser()
  const authErr = handleAuthError(error)
  if (authErr) return authErr

  const { id: gameId, msgId } = await params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }
  const { content } = body
  if (!content?.trim()) return NextResponse.json({ error: 'emptyMessage' }, { status: 400 })
  if (content.length > 200_000) return NextResponse.json({ error: 'messageTooLong' }, { status: 400 })

  const sanitized = sanitizeBody(content)
  if (!sanitized?.trim()) return NextResponse.json({ error: 'emptyMessage' }, { status: 400 })

  try {
    const existing = await queryOne<{ id: string; participant_id: string; type: string; status: string; published_at: string | null }>(
      `SELECT m.id, m.participant_id, m.type, g.status, g.published_at
       FROM messages m
       JOIN game_participants gp ON gp.id = m.participant_id
       JOIN games g ON g.id = m.game_id
       WHERE m.id = $1 AND m.game_id = $2 AND gp.user_id = $3`,
      [msgId, gameId, user!.id]
    )
    if (!existing) return NextResponse.json({ error: 'notFound' }, { status: 404 })
    if (existing.published_at || existing.status === 'moderation' || existing.status === 'published') return NextResponse.json({ error: 'gameAlreadyPublished' }, { status: 403 })
    if (existing.type === 'dice') return NextResponse.json({ error: 'cannotEditDice' }, { status: 400 })

    const updated = await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2 RETURNING id, content, edited_at`,
        [sanitized, msgId]
      )
      // Сбрасываем только своё согласие на публикацию
      await client.query(
        `DELETE FROM game_publish_consent WHERE game_id = $1 AND participant_id = $2`,
        [gameId, existing.participant_id]
      )
      return result.rows[0]
    })

    notifyGame(gameId, { _type: 'edit', ...(updated as object) })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[API /api/games/[id]/messages/[msgId]] PATCH:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

