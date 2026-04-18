import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser, requireUser, handleAuthError } from '@/lib/session'
import { notifyGame } from '@/lib/sse'
import { sanitizeBody } from '@/lib/sanitize'
import { getActiveStopPhrases, checkStopList, VIOLATION_THRESHOLD } from '@/lib/stoplist'
import { requireParticipant } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { PAGE_SIZE } from '@/lib/constants'

// GET — paginated messages + search
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Verify caller is a participant (moderators can read any game)
  const isMod = user.role === 'moderator' || user.role === 'admin'
  const participant = await requireParticipant(gameId, user.id, { includeLeft: true })
  if (!participant && !isMod) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const type = sp.get('type') || 'ic'
  const search = (sp.get('search') || '').trim()
  const limit = Math.min(parseInt(sp.get('limit') || String(PAGE_SIZE), 10) || PAGE_SIZE, 100)

  // Type filter: ic = everything except ooc and dice; ooc = only ooc
  const typeFilter = type === 'ooc' ? "m.type = 'ooc'" : "m.type NOT IN ('ooc', 'dice')"

  try {
    // ── Search mode ──
    if (search.length >= 2) {
      const escaped = search.replace(/[%_\\]/g, '\\$&')

      // Один запрос вместо двух: COUNT(*) OVER() внутри CTE возвращает общее
      // число сообщений этого типа в каждой строке результата — используем
      // для вычисления totalPages.
      const results = await query<{
        id: string; content: string; created_at: string; nickname: string; global_row: number; _total: string
      }>(
        `WITH numbered AS (
          SELECT m.id, m.content, m.created_at, gp.nickname,
                 ROW_NUMBER() OVER (ORDER BY m.created_at ASC, m.id ASC) as global_row,
                 COUNT(*) OVER () as _total
          FROM messages m
          JOIN game_participants gp ON gp.id = m.participant_id
          WHERE m.game_id = $1 AND ${typeFilter}
        )
        SELECT id, content, created_at, nickname, global_row, _total
        FROM numbered
        WHERE content ILIKE '%' || $2 || '%'
        ORDER BY created_at DESC
        LIMIT 50`,
        [gameId, escaped]
      )
      const total = results.length > 0 ? parseInt(results[0]._total) : 0
      const totalPages = Math.max(1, Math.ceil(total / limit))

      return NextResponse.json({
        results: results.map(r => ({
          id: r.id,
          snippet: htmlToSnippet(r.content, search),
          created_at: r.created_at,
          nickname: r.nickname,
          page: Math.ceil(Number(r.global_row) / limit),
        })),
        totalPages,
      })
    }

    // ── Pagination mode ──
    const countRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM messages m WHERE m.game_id = $1 AND ${typeFilter}`,
      [gameId]
    )
    const total = parseInt(countRes?.count || '0', 10)
    const totalPages = Math.max(1, Math.ceil(total / limit))

    // Default to last page
    const pageParam = sp.get('page')
    const page = pageParam ? Math.max(1, Math.min(parseInt(pageParam, 10) || totalPages, totalPages)) : totalPages
    const offset = (page - 1) * limit

    const rows = await query(
      `SELECT m.*, gp.nickname, gp.avatar_url, gp.user_id
       FROM messages m
       JOIN game_participants gp ON gp.id = m.participant_id
       WHERE m.game_id = $1 AND ${typeFilter}
       ORDER BY m.created_at ASC, m.id ASC
       LIMIT $2 OFFSET $3`,
      [gameId, limit, offset]
    )

    return NextResponse.json({ messages: rows, total, page, totalPages })
  } catch (error) {
    console.error('[API /api/games/[id]/messages] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// Strip HTML tags for search snippet
function htmlToSnippet(html: string, query: string): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx >= 0) {
    const start = Math.max(0, idx - 40)
    const end = Math.min(text.length, idx + query.length + 40)
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
  }
  return text.slice(0, 100) + (text.length > 100 ? '…' : '')
}

// POST — отправить сообщение
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  const authErr = handleAuthError(error)
  if (authErr) return authErr

  const { allowed } = rateLimit(`messages:${user!.id}`, 30, 60_000)
  if (!allowed) return NextResponse.json({ error: 'errors.tooManyRequests' }, { status: 429 })

  const { id: gameId } = await params

  try {
    // Check if game is frozen by moderation
    const game = await queryOne<{ moderation_status: string; status: string }>('SELECT moderation_status, status FROM games WHERE id=$1', [gameId])
    if (game && game.moderation_status !== 'visible') {
      return NextResponse.json({ error: 'gameFrozen' }, { status: 403 })
    }
    let msgBody
    try {
      msgBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
    }
    const { content, type = 'ic' } = msgBody
    if (!content?.trim()) return NextResponse.json({ error: 'emptyMessage' }, { status: 400 })
    if (content.length > 200_000) return NextResponse.json({ error: 'messageTooLong' }, { status: 400 })
    const msgType = type === 'ooc' ? 'ooc' : 'ic'

    // Block IC posts when game is not active (preparing/moderation/published); OOC still allowed
    if (game && game.status !== 'active' && msgType === 'ic') {
      return NextResponse.json({ error: 'gameFinished' }, { status: 403 })
    }

    // Проверка участия ДО стоп-листа: иначе неучастник мог бы записывать
    // stop_violations на чужую игру и спровоцировать её автоскрытие.
    const participant = await requireParticipant(gameId, user.id)
    if (!participant) {
      return NextResponse.json({ error: 'notParticipant' }, { status: 403 })
    }

    // Stop-list check
    const stopPhrases = await getActiveStopPhrases()
    if (stopPhrases.length > 0) {
      const match = checkStopList(content, stopPhrases)
      if (match) {
        await query(
          `INSERT INTO stop_violations (game_id, user_id, phrase_id, matched_text, message_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [gameId, user.id, match.phraseId, match.context, msgType]
        )
        const countRow = await queryOne<{ cnt: string }>(
          'SELECT COUNT(*) as cnt FROM stop_violations WHERE game_id = $1',
          [gameId]
        )
        if (parseInt(countRow?.cnt || '0') >= VIOLATION_THRESHOLD && game?.moderation_status === 'visible') {
          await query("UPDATE games SET moderation_status = 'hidden' WHERE id = $1", [gameId])
          await query(
            'UPDATE stop_violations SET auto_hidden = true WHERE game_id = $1 ORDER BY created_at DESC LIMIT 1',
            [gameId]
          )
        }
        return NextResponse.json({ error: 'stopListBlocked' }, { status: 422 })
      }
    }

    const message = await queryOne<{ id: string }>(
      `INSERT INTO messages (game_id, participant_id, content, type)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [gameId, participant.id, sanitizeBody(content), msgType]
    )
    if (!message) return NextResponse.json({ error: 'serverError' }, { status: 500 })

    // Получаем полные данные с никнеймом
    const full = await queryOne<Record<string, unknown>>(
      `SELECT m.*, gp.nickname, gp.avatar_url, gp.user_id
       FROM messages m
       JOIN game_participants gp ON gp.id = m.participant_id
       WHERE m.id = $1`,
      [message.id]
    )

    // Нотифицируем SSE-слушателей
    if (full) notifyGame(gameId, { _type: 'new', ...full })

    return NextResponse.json(full, { status: 201 })
  } catch (error) {
    console.error('[API /api/games/[id]/messages] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
