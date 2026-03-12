import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { randomBytes } from 'crypto'

// POST — создать инвайт-ссылку
export async function POST(req: NextRequest) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })

  const { requestId } = await req.json()

  // Verify ownership
  const request = await queryOne<{ author_id: string }>(
    'SELECT author_id FROM requests WHERE id = $1', [requestId]
  )
  if (!request) return NextResponse.json({ error: 'notFound' }, { status: 404 })
  if (request.author_id !== user!.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const token = randomBytes(16).toString('hex')

  await query(
    'INSERT INTO invites (token, request_id) VALUES ($1,$2)',
    [token, requestId]
  )

  return NextResponse.json({ token })
}
