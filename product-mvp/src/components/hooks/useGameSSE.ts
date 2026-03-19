import { useEffect, useRef } from 'react'
import type { Message } from '../game/types'

export function useGameSSE({ gameId, isLeft, onNewMessage, onEditMessage, onDiceMessage, onStatusChanged, onPublishRequest, onPublishRevoked }: {
  gameId: string
  isLeft: boolean
  onNewMessage: (msg: Message) => void
  onEditMessage: (data: { id: string; content: string; edited_at: string }) => void
  onDiceMessage: (data: { sides: number; result: number; roller: string }) => void
  onStatusChanged: (data: { status: string; choice?: string }) => void
  onPublishRequest: () => void
  onPublishRevoked: () => void
}) {
  const onNewMessageRef = useRef(onNewMessage)
  const onEditMessageRef = useRef(onEditMessage)
  const onDiceMessageRef = useRef(onDiceMessage)
  const onStatusChangedRef = useRef(onStatusChanged)
  const onPublishRequestRef = useRef(onPublishRequest)
  const onPublishRevokedRef = useRef(onPublishRevoked)

  onNewMessageRef.current = onNewMessage
  onEditMessageRef.current = onEditMessage
  onDiceMessageRef.current = onDiceMessage
  onStatusChangedRef.current = onStatusChanged
  onPublishRequestRef.current = onPublishRequest
  onPublishRevokedRef.current = onPublishRevoked

  useEffect(() => {
    if (isLeft) return
    const es = new EventSource(`/api/games/${gameId}/messages/stream`)
    es.onmessage = e => {
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
    return () => es.close()
  }, [gameId, isLeft])
}
