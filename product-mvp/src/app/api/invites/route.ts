import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getUser } from '@/lib/session'
import { randomBytes } from 'crypto'

// POST — создать инвайт-ссылку
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { requestId } = await req.json()
  const token = randomBytes(16).toString('hex')

  await query(
    'INSERT INTO invites (token, request_id) VALUES ($1,$2)',
    [token, requestId]
  )

  return NextResponse.json({ token })
}
