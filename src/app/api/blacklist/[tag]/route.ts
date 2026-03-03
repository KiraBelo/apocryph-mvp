import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/session'
import pool from '@/lib/db'

// DELETE /api/blacklist/[tag] — убрать тег из чёрного списка
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { tag } = await params
  await pool.query(
    'DELETE FROM user_tag_blacklist WHERE user_id = $1 AND tag = $2',
    [user.id, decodeURIComponent(tag)]
  )
  return NextResponse.json({ ok: true })
}
