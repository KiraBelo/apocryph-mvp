import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/session'
import { queryOne } from '@/lib/db'
import { subscribe, canConnect, trackConnect, trackDisconnect } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireUser()
  if (error === 'unauthorized') return new Response('Unauthorized', { status: 401 })
  if (error === 'banned') return new Response('Banned', { status: 403 })

  const { id: gameId } = await params

  // Verify user is a participant of this game (or a moderator)
  const isMod = user!.role === 'moderator' || user!.role === 'admin'
  if (!isMod) {
    const participant = await queryOne(
      'SELECT id FROM game_participants WHERE game_id=$1 AND user_id=$2',
      [gameId, user!.id]
    )
    if (!participant) return new Response('Forbidden', { status: 403 })
  }

  if (!canConnect(user!.id)) {
    return new Response('Too many connections', { status: 429 })
  }

  const userId = user!.id
  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | undefined

  trackConnect(userId)

  const stream = new ReadableStream({
    start(controller) {
      // Keep-alive ping every 20s
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(ping)
        }
      }, 20000)

      unsubscribe = subscribe(gameId, (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          clearInterval(ping)
        }
      })

      req.signal.addEventListener('abort', () => {
        clearInterval(ping)
        unsubscribe?.()
        trackDisconnect(userId)
        controller.close()
      })
    },
    cancel() {
      unsubscribe?.()
      trackDisconnect(userId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
