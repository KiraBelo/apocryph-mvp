import { NextResponse } from 'next/server'
import { getUser } from '@/lib/session'
import { query } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  let tab = 'ic'
  try {
    const body = await req.json()
    if (body?.tab === 'ooc') tab = 'ooc'
  } catch { /* no body */ }

  try {
    if (tab === 'ooc') {
      await query(
        `UPDATE game_participants SET last_read_ooc_at = NOW() WHERE game_id = $1 AND user_id = $2`,
        [id, user.id]
      )
    } else {
      await query(
        `UPDATE game_participants SET last_read_at = NOW() WHERE game_id = $1 AND user_id = $2`,
        [id, user.id]
      )
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/games/[id]/read] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
