import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getUser } from '@/lib/session'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const rows = await query(
      `SELECT r.*, b.created_at as bookmarked_at
       FROM bookmarks b
       JOIN requests r ON r.id = b.request_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [user.id]
    )
    return NextResponse.json(rows)
  } catch (error) {
    console.error('[API /api/bookmarks] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
