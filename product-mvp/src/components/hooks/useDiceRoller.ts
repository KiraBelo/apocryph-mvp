import { useState } from 'react'
import type { ToastType } from '../ToastProvider'
import { safeJson } from '@/lib/fetch-utils'

export function useDiceRoller({ gameId, participantId, t, addToast }: {
  gameId: string
  participantId: string
  t: (key: string) => unknown
  addToast: (msg: string, type?: ToastType) => void
}) {
  const [diceQueue, setDiceQueue] = useState<{ sides: number; result: number; roller: string }[]>([])
  const [showDicePanel, setShowDicePanel] = useState(false)
  const [diceSides, setDiceSides] = useState('20')
  const [diceRolling, setDiceRolling] = useState(false)

  async function rollDice() {
    const s = parseInt(diceSides)
    if (isNaN(s) || s < 2 || s > 100) return
    setDiceRolling(true)
    try {
      const res = await fetch(`/api/games/${gameId}/dice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sides: s }),
      })
      if (!res.ok) { const d = await safeJson(res); addToast(t(`errors.${d.error}`) as string || t('errors.networkError') as string, 'error'); return }
    } catch { addToast(t('errors.networkError') as string, 'error') }
    finally { setDiceRolling(false) }
  }

  function enqueueDice(data: { sides: number; result: number; roller: string }) {
    setDiceQueue(prev => [...prev, data])
  }

  function dismissDice() {
    setDiceQueue(q => q.slice(1))
  }

  return {
    diceQueue, showDicePanel, setShowDicePanel,
    diceSides, setDiceSides, diceRolling,
    rollDice, enqueueDice, dismissDice,
  }
}
