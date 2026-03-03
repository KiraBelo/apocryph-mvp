import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser } from '@/lib/session'

// GET /api/requests — лента с фильтрами
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const type         = sp.get('type')         // duo | multiplayer
  const contentLevel = sp.get('content')      // none | rare | often | core
  const fandomType   = sp.get('fandom_type')  // fandom | original
  const pairing      = sp.get('pairing')      // sl | fm | gt | any
  const tags         = sp.get('tags')         // comma-separated
  const q            = sp.get('q')            // text search
  const mine         = sp.get('mine')         // 'true'

  const user = await getUser()

  const conditions: string[] = ['r.is_public = true', "r.status = 'active'"]
  const params: unknown[]    = []
  let p = 1

  if (mine === 'true' && user) {
    conditions.length = 0
    conditions.push(`r.author_id = $${p++}`)
    params.push(user.id)
  }
  if (type)         { conditions.push(`r.type = $${p++}`);          params.push(type) }
  if (contentLevel) { conditions.push(`r.content_level = $${p++}`); params.push(contentLevel) }
  if (fandomType)   { conditions.push(`r.fandom_type = $${p++}`);   params.push(fandomType) }
  if (pairing)      { conditions.push(`r.pairing = $${p++}`);       params.push(pairing) }
  if (tags) {
    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
    if (tagArr.length) {
      conditions.push(`r.tags && $${p++}`)
      params.push(tagArr)
    }
  }
  if (q) {
    conditions.push(`(r.title ILIKE $${p} OR r.body ILIKE $${p})`)
    params.push(`%${q}%`)
    p++
  }

  // Фильтр по чёрному списку тегов (только для авторизованных, не в режиме mine)
  if (user && mine !== 'true') {
    const blacklist = await query<{ tag: string }>(
      'SELECT tag FROM user_tag_blacklist WHERE user_id = $1',
      [user.id]
    )
    if (blacklist.length) {
      conditions.push(`NOT (r.tags && $${p++})`)
      params.push(blacklist.map(r => r.tag))
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = await query(
    `SELECT r.*, u.email as author_email
     FROM requests r
     JOIN users u ON u.id = r.author_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  )
  return NextResponse.json(rows)
}

// POST /api/requests — создать заявку
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const body = await req.json()
  const { title, description, type, content_level, fandom_type, pairing, tags, is_public, status } = body

  if (!title || !type || !content_level) {
    return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 })
  }

  const row = await queryOne(
    `INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, tags, is_public, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [user.id, title, description || null, type, content_level,
     fandom_type || 'original', pairing || 'any',
     tags || [], is_public ?? true, status || 'draft']
  )
  return NextResponse.json(row, { status: 201 })
}
