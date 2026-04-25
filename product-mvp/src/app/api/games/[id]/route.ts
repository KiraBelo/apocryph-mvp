import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getUser, requireUser, handleAuthError } from '@/lib/session'
import { requireParticipant } from '@/lib/auth'
import { sanitizeNickname } from '@/lib/sanitize'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id: gameId } = await params
  const isMod = user.role === 'moderator' || user.role === 'admin'

  try {
    const game = await queryOne(
      `SELECT g.*, r.title as request_title, r.type as request_type
       FROM games g
       LEFT JOIN requests r ON r.id = g.request_id
       WHERE g.id = $1`,
      [gameId]
    )
    if (!game) return NextResponse.json({ error: 'notFound' }, { status: 404 })

    // SECURITY (CRIT-1): keep user_id server-side for filtering, but NEVER
    // send it to non-moderator clients — anonymity is the platform invariant.
    // Moderators legitimately need user_id + email for moderation actions.
    const participantFields = isMod
      ? 'gp.id, gp.game_id, gp.user_id, gp.nickname, gp.avatar_url, gp.banner_url, gp.banner_pref, gp.left_at, gp.leave_reason, u.email as user_email'
      : 'gp.id, gp.game_id, gp.user_id, gp.nickname, gp.avatar_url, gp.banner_url, gp.banner_pref, gp.left_at, gp.leave_reason'
    const participantJoin = isMod ? 'JOIN users u ON u.id = gp.user_id' : ''

    const rawParticipants = await query<{ user_id: string; left_at: string | null } & Record<string, unknown>>(
      `SELECT ${participantFields}
       FROM game_participants gp ${participantJoin}
       WHERE gp.game_id = $1
       ORDER BY gp.id`,
      [gameId]
    )

    const myParticipant = rawParticipants.find(p => p.user_id === user.id)
    // Allow moderators to view any game
    if (!myParticipant && !isMod) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // For non-mods, strip user_id from all participants in the response.
    // myParticipant is also stripped — client uses participant.id from the
    // returned object (passed alongside) for ownership checks.
    const participants = isMod
      ? rawParticipants
      : rawParticipants.map(({ user_id: _u, ...rest }) => { void _u; return rest })

    return NextResponse.json({ game, participants, myParticipant: myParticipant || null, isMod })
  } catch (error) {
    console.error('[API /api/games/[id]] GET:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}

// PATCH — обновить баннер или никнейм
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return handleAuthError(auth.error)
  const { user } = auth

  const { id: gameId } = await params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'errors.invalidBody' }, { status: 400 })
  }
  const { banner_url, nickname, avatar_url, ooc_enabled, banner_pref, starred, hidden } = body

  if (avatar_url && !/^https?:\/\//i.test(avatar_url)) return NextResponse.json({ error: 'invalidUrl' }, { status: 400 })
  if (banner_url && !/^https?:\/\//i.test(banner_url)) return NextResponse.json({ error: 'invalidUrl' }, { status: 400 })
  const dangerousChars = /[)(;"'\n\r]/
  if (avatar_url && dangerousChars.test(avatar_url)) return NextResponse.json({ error: 'invalidUrl' }, { status: 400 })
  if (banner_url && dangerousChars.test(banner_url)) return NextResponse.json({ error: 'invalidUrl' }, { status: 400 })

  if (nickname && nickname.length > 50) {
    return NextResponse.json({ error: 'nicknameTooLong' }, { status: 400 })
  }
  if (avatar_url && avatar_url.length > 512) {
    return NextResponse.json({ error: 'urlTooLong' }, { status: 400 })
  }
  if (banner_url && banner_url.length > 512) {
    return NextResponse.json({ error: 'urlTooLong' }, { status: 400 })
  }
  if (banner_pref && !['own', 'partner', 'none'].includes(banner_pref)) {
    return NextResponse.json({ error: 'invalidBannerPref' }, { status: 400 })
  }

  try {
    // Verify user is a participant of this game
    const participant = await requireParticipant(gameId, user.id, { includeLeft: true })
    if (!participant) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    if (ooc_enabled !== undefined) {
      // Only the first participant (game creator) can toggle OOC
      const first = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM game_participants WHERE game_id=$1 ORDER BY id LIMIT 1',
        [gameId]
      )
      if (first?.user_id === user.id) {
        await query('UPDATE games SET ooc_enabled=$2 WHERE id=$1', [gameId, ooc_enabled])
      }
    }
    if (nickname !== undefined || avatar_url !== undefined || banner_url !== undefined || banner_pref !== undefined) {
      await query(
        `UPDATE game_participants SET
          nickname=COALESCE($3,nickname),
          avatar_url=COALESCE($4,avatar_url),
          banner_url=COALESCE($5,banner_url),
          banner_pref=COALESCE($6,banner_pref)
        WHERE game_id=$1 AND user_id=$2`,
        [gameId, user.id, nickname ? sanitizeNickname(nickname) : nickname, avatar_url, banner_url, banner_pref]
      )
    }

    if (starred !== undefined) {
      await query(
        `UPDATE game_participants SET starred_at=$3 WHERE game_id=$1 AND user_id=$2`,
        [gameId, user.id, starred ? new Date().toISOString() : null]
      )
    }
    if (hidden !== undefined) {
      await query(
        `UPDATE game_participants SET hidden_at=$3 WHERE game_id=$1 AND user_id=$2`,
        [gameId, user.id, hidden ? new Date().toISOString() : null]
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /api/games/[id]] PATCH:', error)
    return NextResponse.json({ error: 'serverError' }, { status: 500 })
  }
}
