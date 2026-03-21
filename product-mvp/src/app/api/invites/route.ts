import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { randomBytes } from 'crypto'

// POST — создать инвайт-ссылку
export async function POST(req: NextRequest) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })

  let requestId: string
  try {
    ({ requestId } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  try {
    // Verify ownership
    const request = await queryOne<{ author_id: string }>(
      'SELECT author_id FROM requests WHERE id = $1', [requestId]
    )
    if (!request) return NextResponse.json({ error: 'notFound' }, { status: 404 })
    if (request.author_id !== user!.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const token = randomBytes(16).toString('hex')

    await query(
      "INSERT INTO invites (token, request_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')",
      [token, requestId]
    )

    return NextResponse.json({ token })
  } catch (error) {
    console.error('[API /api/invites] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
