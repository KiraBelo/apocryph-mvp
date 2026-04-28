import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireUser, handleAuthError } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'
import { randomBytes } from 'crypto'

// POST — создать инвайт-ссылку
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  // HIGH-S3 (audit-v4): every write endpoint has a rate limit. 10/min is
  // generous for legitimate use (creating invite links is rare) and tight
  // enough to make link-spamming impractical.
  const { allowed } = rateLimit(`invites:${user.id}`, 10, 60_000)
  if (!allowed) return NextResponse.json({ error: 'limitReached' }, { status: 429 })

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
    if (request.author_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

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
