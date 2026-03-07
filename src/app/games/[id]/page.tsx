import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/lib/session'
import { queryOne, query } from '@/lib/db'
import GameDialogClient from '@/components/GameDialogClient'

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const game = await queryOne<{ id: string; request_id: string | null; banner_url: string | null; ooc_enabled: boolean; created_at: string }>(
    'SELECT * FROM games WHERE id=$1', [gameId]
  )
  if (!game) notFound()

  const participants = await query<{
    id: string; user_id: string; nickname: string; avatar_url: string | null; banner_url: string | null; banner_pref: string; left_at: string | null; leave_reason: string | null
  }>('SELECT * FROM game_participants WHERE game_id=$1 ORDER BY id', [gameId])

  const me = participants.find(p => p.user_id === user.id)
  if (!me) notFound()

  const messages = await query<{
    id: string; game_id: string; participant_id: string; content: string; created_at: string;
    edited_at: string | null; nickname: string; avatar_url: string | null; user_id: string; type: string
  }>(
    `SELECT m.*, gp.nickname, gp.avatar_url, gp.user_id
     FROM messages m
     JOIN game_participants gp ON gp.id = m.participant_id
     WHERE m.game_id = $1
     ORDER BY m.created_at ASC`,
    [gameId]
  )

  const requestTitle = game.request_id
    ? (await queryOne<{ title: string }>('SELECT title FROM requests WHERE id=$1', [game.request_id]))?.title
    : null

  return (
    <GameDialogClient
      gameId={gameId}
      game={game}
      initialMessages={messages}
      participants={participants}
      me={me}
      userId={user.id}
      requestTitle={requestTitle ?? null}
    />
  )
}
