import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'

// POST — добавить в закладки
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id: requestId } = await params

  // Проверить лимит 50
  const count = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM bookmarks WHERE user_id=$1', [user.id]
  )
  if (count && parseInt(count.count) >= 50) {
    return NextResponse.json({ error: 'limitReached' }, { status: 400 })
  }

  await query(
    'INSERT INTO bookmarks (user_id, request_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [user.id, requestId]
  )
  return NextResponse.json({ ok: true })
}

// DELETE — удалить из закладок
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id: requestId } = await params
  await query('DELETE FROM bookmarks WHERE user_id=$1 AND request_id=$2', [user.id, requestId])
  return NextResponse.json({ ok: true })
}
