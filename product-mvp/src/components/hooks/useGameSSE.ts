import { useEffect, useRef } from 'react'
import type { Message } from '../game/types'

// After this many consecutive errors with no successful message in
// between, surface a toast so the user knows real-time updates are
// dead — not just silently logged. EventSource auto-reconnects on a
// loose network blip, but a server-side outage will keep firing
// onerror without messages.
const ERROR_TOAST_THRESHOLD = 3

export function useGameSSE({ gameId, isLeft, onNewMessage, onEditMessage, onDiceMessage, onStatusChanged, onPublishRequest, onPublishRevoked, onConnectionLost }: {
  gameId: string
  isLeft: boolean
  onNewMessage: (msg: Message) => void
  onEditMessage: (data: { id: string; content: string; edited_at: string }) => void
  onDiceMessage: (data: { sides: number; result: number; roller: string }) => void
  onStatusChanged: (data: { status: string; choice?: string }) => void
  onPublishRequest: () => void
  onPublishRevoked: () => void
  /** Called once per outage when consecutive errors cross the
   *  `ERROR_TOAST_THRESHOLD`. Use it to show a toast/banner. */
  onConnectionLost?: () => void
}) {
  const onNewMessageRef = useRef(onNewMessage)
  const onEditMessageRef = useRef(onEditMessage)
  const onDiceMessageRef = useRef(onDiceMessage)
  const onStatusChangedRef = useRef(onStatusChanged)
  const onPublishRequestRef = useRef(onPublishRequest)
  const onPublishRevokedRef = useRef(onPublishRevoked)
  const onConnectionLostRef = useRef(onConnectionLost)

  // Обновляем ref-ы в effect (а не в render) — React 19 запрещает мутации
  // refs во время render. Effect выполняется после коммита, до него
  // callbacks в EventSource используют прежние значения (безопасно, т.к.
  // EventSource тоже подключается в другом effect).
  useEffect(() => { onNewMessageRef.current = onNewMessage })
  useEffect(() => { onEditMessageRef.current = onEditMessage })
  useEffect(() => { onDiceMessageRef.current = onDiceMessage })
  useEffect(() => { onStatusChangedRef.current = onStatusChanged })
  useEffect(() => { onPublishRequestRef.current = onPublishRequest })
  useEffect(() => { onPublishRevokedRef.current = onPublishRevoked })
  useEffect(() => { onConnectionLostRef.current = onConnectionLost })

  useEffect(() => {
    if (isLeft) return
    const es = new EventSource(`/api/games/${gameId}/messages/stream`)
    let consecutiveErrors = 0
    let outageNotified = false
    es.onmessage = e => {
      consecutiveErrors = 0
      outageNotified = false
      const data = JSON.parse(e.data)
      if (data._type === 'edit') {
        onEditMessageRef.current({ id: data.id, content: data.content, edited_at: data.edited_at })
      } else if (data._type === 'statusChanged') {
        onStatusChangedRef.current({ status: data.status, choice: data.choice })
      } else if (data._type === 'publishRequest') {
        onPublishRequestRef.current()
      } else if (data._type === 'publishRevoked') {
        onPublishRevokedRef.current()
      } else if (data.type === 'dice') {
        try {
          const parsed = JSON.parse(data.content)
          onDiceMessageRef.current({ sides: parsed.sides, result: parsed.result, roller: parsed.roller })
        } catch (e) { console.error('SSE dice parse error:', e) }
      } else {
        const { _type: _, ...msg } = data
        onNewMessageRef.current(msg as Message)
      }
    }
    es.onerror = () => {
      consecutiveErrors += 1
      console.warn('[SSE] Connection error, EventSource will auto-reconnect')
      if (consecutiveErrors >= ERROR_TOAST_THRESHOLD && !outageNotified) {
        outageNotified = true
        onConnectionLostRef.current?.()
      }
    }
    return () => es.close()
  }, [gameId, isLeft])
}
