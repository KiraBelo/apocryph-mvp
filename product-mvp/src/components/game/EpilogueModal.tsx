'use client'
import { useT } from '../SettingsContext'
import { MIN_IC_POSTS } from './types'

interface EpilogueModalProps {
  requestTitle: string | null
  participants: { nickname: string }[]
  icPostCount: number
  publishLoading: boolean
  onPublish: () => void
  onSkip: () => void
}

export default function EpilogueModal({
  requestTitle, participants, icPostCount,
  publishLoading, onPublish, onSkip,
}: EpilogueModalProps) {
  const t = useT()
  const canPublish = icPostCount >= MIN_IC_POSTS

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
    >
      <div className="w-full max-w-[460px] text-center" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '3rem 2.5rem' }}>

        {/* Decorative line */}
        <div className="mx-auto mb-6 w-12 border-t border-edge" />

        {/* Title */}
        <h2 className="font-heading text-2xl italic text-ink mb-2">
          {requestTitle ?? t('nav.untitled') as string}
        </h2>

        {/* Subtitle */}
        <p className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-2 mb-6">
          {t('game.epilogueSubtitle') as string}
        </p>

        {/* Participants */}
        <p className="font-body text-[0.9rem] text-ink-2 mb-1">
          {participants.map(p => p.nickname).join('  &  ')}
        </p>

        {/* Post count */}
        <p className="font-mono text-[0.6rem] text-ink-2 tracking-wide mb-8">
          {icPostCount} {t('game.epiloguePosts') as string}
        </p>

        {/* Decorative line */}
        <div className="mx-auto mb-8 w-16 border-t border-edge" />

        {/* Publish question */}
        {canPublish && (
          <p className="font-body text-[0.85rem] text-ink-2 mb-6 italic">
            {t('game.epilogueQuestion') as string}
          </p>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {canPublish && (
            <button
              onClick={onPublish}
              disabled={publishLoading}
              className="btn-primary w-full p-[0.65rem] text-[0.9rem]"
            >
              {t('game.publishToLibrary') as string}
            </button>
          )}
          <button
            onClick={onSkip}
            className="btn-ghost w-full p-[0.5rem] text-[0.75rem]"
          >
            {canPublish ? t('game.keepPrivate') as string : t('game.epilogueContinue') as string}
          </button>
          {!canPublish && (
            <p className="font-mono text-[0.5rem] text-ink-2 tracking-wide">
              {t('game.tooFewMessages') as string} ({icPostCount}/{MIN_IC_POSTS})
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
