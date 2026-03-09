import { NextRequest } from 'next/server'
import { getUser } from '@/lib/session'
import { subscribe } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id: gameId } = await params

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | undefined

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
        controller.close()
      })
    },
    cancel() {
      unsubscribe?.()
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
