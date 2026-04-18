import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'
import { PAGE_SIZE } from '@/lib/constants'

// GET /api/games?page=N — мои игры (новые сверху), с пагинацией
export async function GET(req: NextRequest) {
  const { error, user } = await requireUser()
  const authErr = handleAuthError(error)
  if (authErr) return authErr

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  try {
    const rows = await query<{ _total: string } & Record<string, unknown>>(
      `SELECT g.*, gp.left_at, gp.nickname as my_nickname,
              r.title as request_title,
              COALESCE(mc.message_count, 0)::text as message_count,
              COALESCE(ap.active_participants, 0)::text as active_participants,
              COUNT(*) OVER() as _total
       FROM games g
       JOIN game_participants gp ON gp.game_id = g.id AND gp.user_id = $1
       LEFT JOIN requests r ON r.id = g.request_id
       LEFT JOIN (
         SELECT game_id, COUNT(*) as message_count FROM messages GROUP BY game_id
       ) mc ON mc.game_id = g.id
       LEFT JOIN (
         SELECT game_id, COUNT(*) as active_participants FROM game_participants WHERE left_at IS NULL GROUP BY game_id
       ) ap ON ap.game_id = g.id
       ORDER BY g.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user!.id, PAGE_SIZE, offset]
    )
    const total = rows.length > 0 ? parseInt(rows[0]._total) : 0
    const items = rows.map(({ _total, ...rest }) => rest)
    return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / PAGE_SIZE) })
  } catch (error) {
    console.error('[API /api/games] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
