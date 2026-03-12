import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'

// GET /api/blacklist — список скрытых тегов текущего пользователя
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const rows = await query<{ tag: string }>(
    'SELECT tag FROM user_tag_blacklist WHERE user_id = $1 ORDER BY tag',
    [user.id]
  )
  return NextResponse.json(rows.map(r => r.tag))
}

// POST /api/blacklist — добавить тег в чёрный список
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { tag } = await req.json()
  const normalized = tag?.trim().toLowerCase()
  if (!normalized) return NextResponse.json({ error: 'invalidTag' }, { status: 400 })
  if (normalized.length > 50) return NextResponse.json({ error: 'invalidTag' }, { status: 400 })

  await queryOne(
    'INSERT INTO user_tag_blacklist (user_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [user.id, normalized]
  )
  return NextResponse.json({ tag: normalized }, { status: 201 })
}

// DELETE /api/blacklist — очистить весь чёрный список
export async function DELETE() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  await query('DELETE FROM user_tag_blacklist WHERE user_id = $1', [user.id])
  return NextResponse.json({ ok: true })
}
