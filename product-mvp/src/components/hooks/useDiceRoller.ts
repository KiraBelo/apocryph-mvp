import { useState } from 'react'

export function useDiceRoller({ gameId, participantId, t }: {
  gameId: string
  participantId: string
  t: (key: string) => unknown
}) {
  const [diceQueue, setDiceQueue] = useState<{ sides: number; result: number; roller: string }[]>([])
  const [showDicePanel, setShowDicePanel] = useState(false)
  const [diceSides, setDiceSides] = useState('20')
  const [diceRolling, setDiceRolling] = useState(false)

  async function rollDice() {
    const s = parseInt(diceSides)
    if (isNaN(s) || s < 2 || s > 100) return
    setDiceRolling(true)
    await fetch(`/api/games/${gameId}/dice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sides: s }),
    })
    setDiceRolling(false)
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
