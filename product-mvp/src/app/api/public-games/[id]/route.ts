import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { sanitizeBody } from '@/lib/sanitize'
import { PAGE_SIZE } from '@/lib/constants'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'))

  try {
    const game = await queryOne<{
      id: string; status: string; published_at: string | null; banner_url: string | null;
      moderation_status: string; request_id: string | null
    }>(
      'SELECT id, status, published_at, banner_url, moderation_status, request_id FROM games WHERE id=$1',
      [gameId]
    )

    if (!game || game.status !== 'published' || game.moderation_status !== 'visible') {
      return NextResponse.json({ error: 'notFound' }, { status: 404 })
    }

    // Request metadata
    const request = game.request_id ? await queryOne<{
      title: string | null; type: string | null; fandom_type: string | null;
      pairing: string | null; content_level: string | null; tags: string[] | null; body: string | null
    }>(
      'SELECT title, type, fandom_type, pairing, content_level, tags, body FROM requests WHERE id=$1',
      [game.request_id]
    ) : null

    // Participants (no user_id, no email)
    const participants = await query<{ id: string; nickname: string; avatar_url: string | null }>(
      'SELECT id, nickname, avatar_url FROM game_participants WHERE game_id=$1 ORDER BY id',
      [gameId]
    )

    // Author user IDs (for comment reply permissions — not exposing nicknames/emails)
    const authorRows = await query<{ user_id: string }>(
      'SELECT user_id FROM game_participants WHERE game_id=$1',
      [gameId]
    )
    const authorUserIds = authorRows.map(r => r.user_id)

    // IC messages count
    const countRes = await queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM messages WHERE game_id=$1 AND type='ic'",
      [gameId]
    )
    const total = parseInt(countRes?.count || '0')
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const offset = (page - 1) * PAGE_SIZE

    // IC messages only
    const messages = await query<{
      id: string; participant_id: string; content: string; created_at: string;
      nickname: string; avatar_url: string | null
    }>(
      `SELECT m.id, m.participant_id, m.content, m.created_at, gp.nickname, gp.avatar_url
       FROM messages m
       JOIN game_participants gp ON gp.id = m.participant_id
       WHERE m.game_id = $1 AND m.type = 'ic'
       ORDER BY m.created_at ASC, m.id ASC
       LIMIT $2 OFFSET $3`,
      [gameId, PAGE_SIZE, offset]
    )

    // Sanitize content
    const safeMessages = messages.map(m => ({
      ...m,
      content: sanitizeBody(m.content) || '',
    }))

    return NextResponse.json({
      game: {
        id: game.id,
        banner_url: game.banner_url,
        published_at: game.published_at,
        author_user_ids: authorUserIds,
      },
      request: request ? {
        title: request.title,
        type: request.type,
        fandom_type: request.fandom_type,
        pairing: request.pairing,
        content_level: request.content_level,
        tags: request.tags,
        body: sanitizeBody(request.body),
      } : null,
      participants,
      messages: safeMessages,
      page,
      totalPages,
      total,
    })
  } catch (error) {
    console.error('[API /api/public-games/[id]] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
