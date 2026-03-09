import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db'
import { getUser } from '@/lib/session'
import { sanitizeBody } from '@/lib/sanitize'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await queryOne(
    `SELECT r.*, u.email as author_email FROM requests r JOIN users u ON u.id = r.author_id WHERE r.id = $1`,
    [id]
  )
  if (!row) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { id } = await params
  const request = await queryOne<{ author_id: string }>(
    'SELECT author_id FROM requests WHERE id = $1', [id]
  )
  if (!request) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
  if (request.author_id !== user.id) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })

  const body = await req.json()

  // Status-only update (from MyRequestsClient quick actions)
  if (body.status && Object.keys(body).length === 1) {
    const validStatuses = ['active', 'inactive', 'draft']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Неверный статус' }, { status: 400 })
    }
    const row = await queryOne(
      `UPDATE requests SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id, body.status]
    )
    return NextResponse.json(row)
  }

  // Full update
  const { title, description, type, content_level, fandom_type, pairing, tags, is_public, status } = body

  if (title && title.length > 200) {
    return NextResponse.json({ error: 'Заголовок не может быть длиннее 200 символов' }, { status: 400 })
  }
  if (description && description.length > 200_000) {
    return NextResponse.json({ error: 'Текст заявки слишком длинный' }, { status: 400 })
  }
  const tagsArr: string[] = (tags || []).map((t: string) => t.trim().toLowerCase()).filter(Boolean)
  if (tagsArr.length > 20 || tagsArr.some((t: string) => t.length > 50)) {
    return NextResponse.json({ error: 'Слишком много тегов или тег слишком длинный (макс. 50 симв.)' }, { status: 400 })
  }

  const structuredTags: { id?: number; slug: string }[] = body.structured_tags || []

  const row = await withTransaction(async (client) => {
    const res = await client.query(
      `UPDATE requests SET
         title=$2, body=$3, type=$4, content_level=$5, fandom_type=$6, pairing=$7,
         tags=$8, is_public=$9, status=$10, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [id, title, sanitizeBody(description), type, content_level,
       fandom_type || 'original', pairing || 'any',
       tagsArr, is_public, status]
    )

    // Dual-write: replace request_tags
    if (structuredTags.length > 0) {
      await client.query('DELETE FROM request_tags WHERE request_id = $1', [id])
      for (const tag of structuredTags) {
        let tagId = tag.id
        if (!tagId) {
          const found = await client.query(
            'SELECT id FROM tags WHERE slug = $1', [tag.slug]
          )
          tagId = found.rows[0]?.id
        }
        if (tagId) {
          await client.query(
            'INSERT INTO request_tags (request_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, tagId]
          )
        }
      }
    }

    return res.rows[0]
  })

  return NextResponse.json(row)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { id } = await params
  const request = await queryOne<{ author_id: string }>(
    'SELECT author_id FROM requests WHERE id = $1', [id]
  )
  if (!request) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
  if (request.author_id !== user.id) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })

  await query('DELETE FROM requests WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
