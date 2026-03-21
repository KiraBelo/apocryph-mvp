'use client'
import { useCallback, useEffect, useState } from 'react'
import type { GameStatus } from '@/types/api'

type TranslateFunc = (key: string) => string | readonly string[] | Record<string, string>

interface UsePublishFlowParams {
  gameId: string
  gameStatus: GameStatus
  participantId: string
  t: TranslateFunc
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  setGameStatus: (status: GameStatus) => void
  setActiveTab: (tab: 'ic' | 'ooc' | 'notes' | 'prepare') => void
  setShowPublishModal: (show: boolean) => void
  setShowModerationSent: (show: boolean) => void
}

export default function usePublishFlow({
  gameId, gameStatus, participantId, t, addToast,
  setGameStatus, setActiveTab, setShowPublishModal, setShowModerationSent,
}: UsePublishFlowParams) {
  const [myPublishConsent, setMyPublishConsent] = useState(false)
  const [partnerPublishConsent, setPartnerPublishConsent] = useState(false)
  const [partnerWantsPublish, setPartnerWantsPublish] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishLoaded, setPublishLoaded] = useState(false)
  const [icPostCount, setIcPostCount] = useState(0)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Load consent data on mount and when publishLoaded is reset
  useEffect(() => {
    if (publishLoaded) return
    fetch(`/api/games/${gameId}/publish-consent`).then(r => r.json()).then(data => {
      if (data.participants) {
        const myP = data.participants.find((p: { participant_id: string }) => p.participant_id === participantId)
        const otherP = data.participants.find((p: { participant_id: string }) => p.participant_id !== participantId)
        setMyPublishConsent(!!myP?.consented)
        setPartnerPublishConsent(!!otherP?.consented)
        // Partner wants to publish = partner consented but I haven't yet
        setPartnerWantsPublish(!!otherP?.consented && !myP?.consented && gameStatus === 'active')
      }
      if (data.icPostCount != null) setIcPostCount(data.icPostCount)
      if (data.status) setGameStatus(data.status)
      setPublishLoaded(true)
    }).catch(() => {}) // fire-and-forget: non-critical initial load, UI shows default state
  }, [publishLoaded, gameId, participantId, gameStatus, setGameStatus])

  const handleProposePublish = useCallback(async () => {
    setPublishLoading(true)
    try {
      const res = await fetch(`/api/games/${gameId}/publish-consent`, { method: 'POST' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); addToast(t(`errors.${d.error}`) as string || t('errors.networkError') as string, 'error'); return }
      setMyPublishConsent(true)
    } catch { addToast(t('errors.networkError') as string, 'error') }
    finally { setPublishLoading(false) }
  }, [gameId, t])

  const handlePublishResponse = useCallback(async (choice: 'publish_as_is' | 'edit_first' | 'decline') => {
    setPublishLoading(true)
    try {
      const res = await fetch(`/api/games/${gameId}/publish-response`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice })
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); addToast(t(`errors.${d.error}`) as string || t('errors.networkError') as string, 'error'); return }
      const data = await res.json()
      setPartnerWantsPublish(false)
      setShowPublishModal(false)
      if (data.status) {
        setGameStatus(data.status)
        if (data.status === 'preparing') setActiveTab('prepare')
        if (data.status === 'moderation') setShowModerationSent(true)
      }
    } catch { addToast(t('errors.networkError') as string, 'error') }
    finally { setPublishLoading(false) }
  }, [gameId, t, setGameStatus, setActiveTab, setShowPublishModal, setShowModerationSent])

  const handleRevoke = useCallback(async () => {
    setPublishLoading(true)
    try {
      const res = await fetch(`/api/games/${gameId}/publish-consent`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); addToast(t(`errors.${d.error}`) as string || t('errors.networkError') as string, 'error'); return }
      setGameStatus('active')
      setMyPublishConsent(false)
      setPartnerPublishConsent(false)
      setPartnerWantsPublish(false)
      setPublishLoaded(false)
    } catch { addToast(t('errors.networkError') as string, 'error') }
    finally { setPublishLoading(false) }
  }, [gameId, t, setGameStatus])

  const handleSubmitToModeration = useCallback(async () => {
    setSubmitLoading(true)
    try {
      const res = await fetch(`/api/games/${gameId}/submit-to-moderation`, { method: 'POST' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); addToast(t(`errors.${d.error}`) as string || t('errors.networkError') as string, 'error'); return }
      setGameStatus('moderation')
      setShowModerationSent(true)
    } catch { addToast(t('errors.networkError') as string, 'error') }
    finally { setSubmitLoading(false) }
  }, [gameId, t, setGameStatus, setShowModerationSent])

  // SSE callback: partner requested publish
  const onSsePublishRequest = useCallback(() => {
    setPartnerWantsPublish(true)
    setPublishLoaded(false)
  }, [])

  // SSE callback: partner revoked publish
  const onSsePublishRevoked = useCallback(() => {
    setPartnerWantsPublish(false)
    setMyPublishConsent(false)
    setPartnerPublishConsent(false)
    setGameStatus('active')
  }, [setGameStatus])

  // SSE callback: status changed — refresh consent state
  const onSseStatusChanged = useCallback(() => {
    setPublishLoaded(false)
  }, [])

  const resetConsent = useCallback(() => {
    setMyPublishConsent(false)
    setPartnerPublishConsent(false)
    setPartnerWantsPublish(false)
  }, [])

  const resetMyConsent = useCallback(() => {
    setMyPublishConsent(false)
  }, [])

  return {
    myPublishConsent, partnerPublishConsent, partnerWantsPublish,
    publishLoading, icPostCount, submitLoading,
    setPartnerWantsPublish,
    handleProposePublish, handlePublishResponse, handleRevoke, handleSubmitToModeration,
    // Setters for SSE callbacks
    setMyPublishConsent, setPartnerPublishConsent, setIcPostCount, setPublishLoaded,
    // SSE helpers
    onSsePublishRequest, onSsePublishRevoked, onSseStatusChanged,
    resetConsent, resetMyConsent,
  }
}
