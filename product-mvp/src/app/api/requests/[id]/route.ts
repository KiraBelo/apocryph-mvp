import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db'
import { getUser } from '@/lib/session'
import { sanitizeBody } from '@/lib/sanitize'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  const row = await queryOne(
    `SELECT r.id, r.title, r.body, r.type, r.content_level, r.fandom_type, r.pairing, r.tags, r.is_public, r.status, r.author_id, r.created_at, r.updated_at
     FROM requests r WHERE r.id = $1`,
    [id]
  )
  if (!row) return NextResponse.json({ error: 'notFound' }, { status: 404 })
  // Only the author can see non-public or non-active requests
  const r = row as { author_id: string; is_public: boolean; status: string }
  if ((!r.is_public || r.status !== 'active') && r.author_id !== user?.id) {
    return NextResponse.json({ error: 'notFound' }, { status: 404 })
  }
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const request = await queryOne<{ author_id: string }>(
    'SELECT author_id FROM requests WHERE id = $1', [id]
  )
  if (!request) return NextResponse.json({ error: 'notFound' }, { status: 404 })
  if (request.author_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()

  // Status-only update (from MyRequestsClient quick actions)
  if (body.status && Object.keys(body).length === 1) {
    const validStatuses = ['active', 'inactive', 'draft']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'invalidStatus' }, { status: 400 })
    }
    const row = await queryOne(
      `UPDATE requests SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id, body.status]
    )
    return NextResponse.json(row)
  }

  // Full update — require essential fields to prevent accidental data loss
  const { title, description, type, content_level, fandom_type, pairing, tags, is_public, status } = body

  if (!title || !type || !content_level || is_public === undefined) {
    return NextResponse.json({ error: 'fillRequired' }, { status: 400 })
  }
  if (title.length > 200) {
    return NextResponse.json({ error: 'titleTooLong' }, { status: 400 })
  }
  if (description && description.length > 200_000) {
    return NextResponse.json({ error: 'bodyTooLong' }, { status: 400 })
  }
  const tagsArr: string[] = (tags || []).map((t: string) => t.trim().toLowerCase()).filter(Boolean)
  if (tagsArr.length > 20 || tagsArr.some((t: string) => t.length > 50)) {
    return NextResponse.json({ error: 'tooManyTags' }, { status: 400 })
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

    // Dual-write: replace request_tags (always delete, then re-insert)
    await client.query('DELETE FROM request_tags WHERE request_id = $1', [id])
    if (structuredTags.length > 0) {
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
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const request = await queryOne<{ author_id: string }>(
    'SELECT author_id FROM requests WHERE id = $1', [id]
  )
  if (!request) return NextResponse.json({ error: 'notFound' }, { status: 404 })
  if (request.author_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  await query('DELETE FROM requests WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
