import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'
import { sanitizeBody } from '@/lib/sanitize'
import { rateLimit } from '@/lib/rate-limit'
import { PAGE_SIZE } from '@/lib/constants'

// GET — approved comments + author replies (paginated top-level; replies loaded fully)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10))
  const offset = (page - 1) * PAGE_SIZE

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

    // Пагинация по top-level комментариям; replies автора подгружаем полностью
    // (их обычно в разы меньше, чем корневых комментариев).
    const topRows = await query<{
      id: string; content: string; parent_id: null; user_id: string; created_at: string; _total: string
    }>(
      `SELECT id, content, parent_id, user_id, created_at, COUNT(*) OVER() as _total
       FROM game_comments
       WHERE game_id=$1 AND parent_id IS NULL AND approved_at IS NOT NULL
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [gameId, PAGE_SIZE, offset]
    )
    const total = topRows.length > 0 ? parseInt(topRows[0]._total) : 0
    const topIds = topRows.map(r => r.id)

    const replyRows = topIds.length > 0
      ? await query<{ id: string; content: string; parent_id: string; user_id: string; created_at: string }>(
          `SELECT id, content, parent_id, user_id, created_at
           FROM game_comments
           WHERE game_id=$1 AND parent_id = ANY($2::uuid[]) AND approved_at IS NOT NULL
           ORDER BY created_at ASC`,
          [gameId, topIds]
        )
      : []

    type CommentItem = { id: string; content: string; created_at: string; is_author: boolean; author_nickname: string | null; replies: CommentItem[] }

    function toItem(r: { id: string; content: string; user_id: string; created_at: string }): CommentItem {
      const isAuthor = authorNicknames.has(r.user_id)
      return {
        id: r.id, content: r.content, created_at: r.created_at,
        is_author: isAuthor,
        author_nickname: isAuthor ? (authorNicknames.get(r.user_id) ?? null) : null,
        replies: [],
      }
    }

    const byId = new Map<string, CommentItem>()
    const topLevel: CommentItem[] = topRows.map(r => {
      const item = toItem(r)
      byId.set(r.id, item)
      return item
    })
    for (const r of replyRows) {
      const parent = byId.get(r.parent_id)
      if (parent) parent.replies.push(toItem(r))
    }

    return NextResponse.json({
      comments: topLevel,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    })
  } catch (error) {
    console.error('[API /api/public-games/[id]/comments] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// HIGH-F2 (audit-v4): parent_id used to be passed straight into Postgres,
// so a malformed UUID returned 500 (uuid syntax) and a non-existent one
// returned 500 (FK violation). Validate format up-front, then verify the
// parent comment actually belongs to this game.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST — submit comment (authorized users)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // SECURITY (CRIT-2, audit-v4): see likes/route.ts comment.
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

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

  if (parent_id !== null && (typeof parent_id !== 'string' || !UUID_RE.test(parent_id))) {
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

      const parent = await queryOne<{ id: string }>(
        'SELECT id FROM game_comments WHERE id=$1 AND game_id=$2',
        [parent_id, gameId]
      )
      if (!parent) return NextResponse.json({ error: 'notFound' }, { status: 404 })
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
