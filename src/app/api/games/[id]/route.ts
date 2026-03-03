import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { id: gameId } = await params

  const game = await queryOne(
    `SELECT g.*, r.title as request_title, r.type as request_type
     FROM games g
     LEFT JOIN requests r ON r.id = g.request_id
     WHERE g.id = $1`,
    [gameId]
  )
  if (!game) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  const participants = await query(
    `SELECT gp.*, u.email
     FROM game_participants gp
     JOIN users u ON u.id = gp.user_id
     WHERE gp.game_id = $1
     ORDER BY gp.id`,
    [gameId]
  )

  const myParticipant = (participants as Array<{ user_id: string; left_at: string | null }>)
    .find(p => p.user_id === user.id)
  if (!myParticipant) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })

  return NextResponse.json({ game, participants, myParticipant })
}

// PATCH — обновить баннер или никнейм
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { id: gameId } = await params
  const { banner_url, nickname, avatar_url } = await req.json()

  if (banner_url !== undefined) {
    await query('UPDATE games SET banner_url=$2 WHERE id=$1', [gameId, banner_url])
  }
  if (nickname !== undefined || avatar_url !== undefined) {
    await query(
      'UPDATE game_participants SET nickname=COALESCE($3,nickname), avatar_url=COALESCE($4,avatar_url) WHERE game_id=$1 AND user_id=$2',
      [gameId, user.id, nickname, avatar_url]
    )
  }

  return NextResponse.json({ ok: true })
}
