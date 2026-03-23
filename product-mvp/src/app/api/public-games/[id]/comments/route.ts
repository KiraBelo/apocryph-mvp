import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'
import { sanitizeBody } from '@/lib/sanitize'
import { rateLimit } from '@/lib/rate-limit'

// GET — approved comments + author replies
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params

  try {
    const game = await queryOne<{ id: string }>(
      "SELECT id FROM games WHERE id=$1 AND status='published'",
      [gameId]
    )
    if (!game) return NextResponse.json({ error: 'notFound' }, { status: 404 })

    // Get author user_id → nickname map
    const authorRows = await query<{ user_id: string; nickname: string }>(
      'SELECT user_id, nickname FROM game_participants WHERE game_id=$1',
      [gameId]
    )
    const authorNicknames = new Map(authorRows.map(r => [r.user_id, r.nickname]))

    const rows = await query<{
      id: string; content: string; parent_id: string | null; user_id: string; created_at: string
    }>(
      `SELECT id, content, parent_id, user_id, created_at
       FROM game_comments
       WHERE game_id=$1 AND approved_at IS NOT NULL
       ORDER BY created_at ASC`,
      [gameId]
    )

    type CommentItem = { id: string; content: string; created_at: string; is_author: boolean; author_nickname: string | null; replies: CommentItem[] }

    const topLevel: CommentItem[] = []
    const byId = new Map<string, CommentItem>()

    for (const r of rows) {
      const isAuthor = authorNicknames.has(r.user_id)
      const item: CommentItem = {
        id: r.id, content: r.content, created_at: r.created_at,
        is_author: isAuthor,
        author_nickname: isAuthor ? (authorNicknames.get(r.user_id) ?? null) : null,
        replies: [],
      }
      if (!r.parent_id) {
        topLevel.push(item)
        byId.set(r.id, item)
      } else {
        const parent = byId.get(r.parent_id)
        if (parent) parent.replies.push(item)
      }
    }

    return NextResponse.json({ comments: topLevel })
  } catch (error) {
    console.error('[API /api/public-games/[id]/comments] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// POST — submit comment (authorized users)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { allowed } = rateLimit(`comment:${user.id}`, 10, 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'limitReached' }, { status: 429 })
  }

  const { id: gameId } = await params
  let content: string, parent_id: string | null = null
  try {
    const body = await req.json()
    content = body.content
    parent_id = body.parent_id ?? null
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }

  const sanitized = sanitizeBody(content)
  if (!sanitized?.trim()) return NextResponse.json({ error: 'emptyMessage' }, { status: 400 })
  if (sanitized.length > 10_000) return NextResponse.json({ error: 'messageTooLong' }, { status: 400 })

  try {
    const game = await queryOne<{ id: string }>(
      "SELECT id FROM games WHERE id=$1 AND status='published'",
      [gameId]
    )
    if (!game) return NextResponse.json({ error: 'notFound' }, { status: 404 })

    // Only game authors can reply to comments
    if (parent_id) {
      const isAuthor = await queryOne<{ id: string }>(
        'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2',
        [gameId, user.id]
      )
      if (!isAuthor) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    await queryOne(
      `INSERT INTO game_comments (game_id, user_id, content, parent_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [gameId, user.id, sanitized, parent_id]
    )

    return NextResponse.json({ ok: true, pending: true })
  } catch (error) {
    console.error('[API /api/public-games/[id]/comments] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
