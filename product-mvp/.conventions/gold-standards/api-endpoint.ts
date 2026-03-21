// GOLD STANDARD: API Route Handler
// Based on: src/app/api/games/[id]/dice/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { requireParticipant } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 1. Auth check — requireUser() handles session versioning + ban check
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })

  // 2. Rate limiting — per user, per endpoint
  const { allowed } = rateLimit(`endpoint:${user!.id}`, 10, 60_000)
  if (!allowed) return NextResponse.json({ error: 'errors.tooManyRequests' }, { status: 429 })

  // 3. Parse body — always in try/catch
  const { id } = await params
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }

  // 4. Validate input — Number.isInteger for integers, not just parseInt
  const { value } = body
  if (!Number.isInteger(Number(value))) {
    return NextResponse.json({ error: 'invalidData' }, { status: 400 })
  }

  try {
    // 5. Game status guard
    const game = await queryOne<{ status: string }>('SELECT status FROM games WHERE id=$1', [id])
    if (!game) return NextResponse.json({ error: 'notFound' }, { status: 404 })
    if (game.status !== 'active') return NextResponse.json({ error: 'gameNotActive' }, { status: 403 })

    // 6. Participant check — left_at IS NULL by default
    const participant = await requireParticipant(id, user!.id)
    if (!participant) return NextResponse.json({ error: 'notParticipant' }, { status: 403 })

    // 7. Business logic + DB operations
    // ...

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    // 8. Top-level catch — log with API path, return generic error
    console.error('[API /api/endpoint] POST:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
