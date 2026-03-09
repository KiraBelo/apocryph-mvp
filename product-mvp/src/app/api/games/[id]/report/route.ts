import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getUser } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { id: gameId } = await params
  const { reason } = await req.json()

  if (reason && reason.length > 2000) return NextResponse.json({ error: 'Жалоба слишком длинная' }, { status: 400 })

  await query(
    'INSERT INTO reports (game_id, reporter_id, reason) VALUES ($1,$2,$3)',
    [gameId, user.id, reason || 'Не указано']
  )

  return NextResponse.json({ ok: true })
}
