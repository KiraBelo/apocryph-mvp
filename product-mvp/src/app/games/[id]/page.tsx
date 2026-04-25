import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/lib/session'
import { queryOne, query } from '@/lib/db'
import GameDialogClient from '@/components/GameDialogClient'
import type { GameStatus, ModerationStatus } from '@/types/api'
import { PAGE_SIZE } from '@/lib/constants'

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const game = await queryOne<{ id: string; request_id: string | null; banner_url: string | null; ooc_enabled: boolean; created_at: string; moderation_status: ModerationStatus; status: GameStatus; published_at: string | null }>(
    'SELECT * FROM games WHERE id=$1', [gameId]
  )
  if (!game) notFound()

  const isMod = user.role === 'moderator' || user.role === 'admin'

  const rawParticipants = await query<{
    id: string; user_id: string; nickname: string; avatar_url: string | null; banner_url: string | null; banner_pref: 'own' | 'partner' | 'none'; left_at: string | null; leave_reason: string | null
  }>(
    'SELECT id, user_id, nickname, avatar_url, banner_url, banner_pref, left_at, leave_reason FROM game_participants WHERE game_id=$1 ORDER BY id',
    [gameId]
  )

  const myRaw = rawParticipants.find(p => p.user_id === user.id)
  if (!myRaw && !isMod) notFound()

  // SECURITY (CRIT-1, audit-v4): strip user_id from participants — clients
  // must compare via participant.id (per-game opaque), not the real user_id.
  const participants = rawParticipants.map(({ user_id: _u, ...rest }) => { void _u; return rest })

  // myParticipant for the client (no user_id). For moderators who aren't
  // participants, create a synthetic read-only observer entry.
  const me = myRaw
    ? participants.find(p => p.id === myRaw.id)!
    : {
        id: 'mod-observer', nickname: 'Модератор', avatar_url: null,
        banner_url: null, banner_pref: 'none' as const,
        left_at: new Date().toISOString(), leave_reason: null,
      }

  // Count IC messages (excluding ooc and dice)
  const countRes = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM messages WHERE game_id = $1 AND type NOT IN ('ooc', 'dice')`,
    [gameId]
  )
  const total = parseInt(countRes?.count || '0', 10)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const offset = Math.max(0, (totalPages - 1) * PAGE_SIZE)

  // SECURITY (CRIT-1): do NOT select gp.user_id. Use participant_id for
  // ownership comparison on the client (matches /api/games/[id]/messages GET).
  const messages = await query<{
    id: string; game_id: string; participant_id: string; content: string; created_at: string;
    edited_at: string | null; nickname: string; avatar_url: string | null; type: 'ic' | 'ooc' | 'dice'
  }>(
    `SELECT m.*, gp.nickname, gp.avatar_url
     FROM messages m
     JOIN game_participants gp ON gp.id = m.participant_id
     WHERE m.game_id = $1 AND m.type NOT IN ('ooc', 'dice')
     ORDER BY m.created_at ASC, m.id ASC
     LIMIT $2 OFFSET $3`,
    [gameId, PAGE_SIZE, offset]
  )

  const requestTitle = game.request_id
    ? (await queryOne<{ title: string }>('SELECT title FROM requests WHERE id=$1', [game.request_id]))?.title
    : null

  return (
    <GameDialogClient
      gameId={gameId}
      game={game}
      initialMessages={messages}
      initialPage={totalPages}
      totalPages={totalPages}
      participants={participants}
      me={me}
      requestTitle={requestTitle ?? null}
    />
  )
}
