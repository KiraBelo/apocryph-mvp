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

    const comments = await query<{
      id: string; content: string; parent_id: string | null; approved_at: string; created_at: string
    }>(
      `SELECT id, content, parent_id, approved_at, created_at
       FROM game_comments
       WHERE game_id=$1 AND approved_at IS NOT NULL
       ORDER BY created_at ASC`,
      [gameId]
    )

    return NextResponse.json({ comments })
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
