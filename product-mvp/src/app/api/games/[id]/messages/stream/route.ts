import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/session'
import { requireParticipant, isModerator } from '@/lib/auth'
import { subscribe, canConnect, trackConnect, trackDisconnect } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) {
    if (auth.error === 'banned') return new Response('Banned', { status: 403 })
    return new Response('Unauthorized', { status: 401 })
  }
  const { user } = auth

  const { id: gameId } = await params

  // Verify user is a participant of this game (or a moderator)
  if (!isModerator(user)) {
    const participant = await requireParticipant(gameId, user.id, { includeLeft: true })
    if (!participant) return new Response('Forbidden', { status: 403 })
  }

  if (!canConnect(user.id)) {
    return new Response('Too many connections', { status: 429 })
  }

  const userId = user.id
  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | undefined
  let cleaned = false

  trackConnect(userId)

  // SECURITY/RELIABILITY (CRIT-9, audit-v4): when controller.enqueue throws
  // (TCP RST without HTTP close, or reader gone) we previously cleared only
  // the ping interval — leaving the subscriber registered in the SSE Map
  // forever and the connection counter incremented. cleanup() centralises
  // the full teardown so every error path runs all three steps.
  // SKIP-TEST: ReadableStream + controller.enqueue throwing on a real socket
  // teardown is not reproducible in jsdom/node unit tests. Verified by
  // manually killing the dev server connection during /games/[id] open.
  let pingTimer: ReturnType<typeof setInterval> | null = null
  function cleanup(closeController?: () => void) {
    if (cleaned) return
    cleaned = true
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null }
    unsubscribe?.()
    trackDisconnect(userId)
    closeController?.()
  }

  const stream = new ReadableStream({
    start(controller) {
      // Keep-alive ping every 20s
      pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          cleanup(() => controller.close())
        }
      }, 20000)

      unsubscribe = subscribe(gameId, (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          cleanup(() => controller.close())
        }
      })

      req.signal.addEventListener('abort', () => {
        cleanup(() => controller.close())
      })
    },
    cancel() {
      cleanup()
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
