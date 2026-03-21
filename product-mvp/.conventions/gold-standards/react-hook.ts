// GOLD STANDARD: React Hook with addToast parameter
// Based on: src/components/hooks/usePublishFlow.ts

'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameStatus } from '@/types/api'

// 1. Use union types from @/types/api, not string
// 2. Pass addToast as parameter — hooks don't have access to context directly
interface UseExampleParams {
  gameId: string
  gameStatus: GameStatus
  t: (key: string) => string | readonly string[] | Record<string, string>
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
}

export default function useExample({ gameId, gameStatus, t, addToast }: UseExampleParams) {
  const [loading, setLoading] = useState(false)

  // 3. Intervals: use ref + visibility API to pause on hidden tab
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const poll = () => fetch(`/api/games/${gameId}/data`).then(r => r.json()).catch(() => {})
    const start = () => { intervalRef.current = setInterval(poll, 5000) }
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      } else { poll(); start() }
    }
    poll(); start()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [gameId])

  // 4. Async actions: addToast for errors, not alert()
  const handleAction = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/games/${gameId}/action`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        addToast(t(`errors.${d.error}`) as string || t('errors.networkError') as string, 'error')
        return
      }
    } catch { addToast(t('errors.networkError') as string, 'error') }
    finally { setLoading(false) }
  }, [gameId, t, addToast])

  return { loading, handleAction }
}
