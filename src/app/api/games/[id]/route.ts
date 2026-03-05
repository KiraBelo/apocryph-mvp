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
  const { banner_url, nickname, avatar_url, ooc_enabled } = await req.json()

  if (nickname && nickname.length > 50) {
    return NextResponse.json({ error: 'Никнейм не может быть длиннее 50 символов' }, { status: 400 })
  }
  if (avatar_url && avatar_url.length > 512) {
    return NextResponse.json({ error: 'Ссылка на аватар слишком длинная' }, { status: 400 })
  }
  if (banner_url && banner_url.length > 512) {
    return NextResponse.json({ error: 'Ссылка на баннер слишком длинная' }, { status: 400 })
  }

  if (banner_url !== undefined) {
    await query('UPDATE games SET banner_url=$2 WHERE id=$1', [gameId, banner_url])
  }
  if (ooc_enabled !== undefined) {
    await query('UPDATE games SET ooc_enabled=$2 WHERE id=$1', [gameId, ooc_enabled])
  }
  if (nickname !== undefined || avatar_url !== undefined) {
    await query(
      'UPDATE game_participants SET nickname=COALESCE($3,nickname), avatar_url=COALESCE($4,avatar_url) WHERE game_id=$1 AND user_id=$2',
      [gameId, user.id, nickname, avatar_url]
    )
  }

  return NextResponse.json({ ok: true })
}
