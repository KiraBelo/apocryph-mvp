'use client'
import { useT, usePlural } from '../SettingsContext'
import { MIN_IC_POSTS } from '@/lib/constants'

interface EpilogueModalProps {
  requestTitle: string | null
  participants: { nickname: string }[]
  icPostCount: number
  publishLoading: boolean
  onPublish: () => void
  onPrepare: () => void
  onSkip: () => void
}

export default function EpilogueModal({
  requestTitle, participants, icPostCount,
  publishLoading, onPublish, onPrepare, onSkip,
}: EpilogueModalProps) {
  const t = useT()
  const tPlural = usePlural()
  const canPublish = icPostCount >= MIN_IC_POSTS

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 overlay-heavy"
    >
      <div className="w-full max-w-[460px] text-center epilogue-box">

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
        <p className="font-mono text-[0.6rem] text-ink-2 tracking-wide mb-5">
          {tPlural(icPostCount, 'game.epiloguePosts')}
        </p>

        {/* Decorative line */}
        <div className="mx-auto mb-5 w-16 border-t border-edge" />

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {canPublish ? (
            <>
              <p className="font-body text-[0.85rem] text-ink-2 mb-2 italic">
                {t('game.epiloguePrepareQuestion') as string}
              </p>
              <button
                onClick={onPrepare}
                className="btn-primary w-full p-[0.65rem] text-[0.9rem]"
              >
                {t('game.epiloguePrepare') as string}
              </button>
              <button
                onClick={onPublish}
                disabled={publishLoading}
                className="btn-ghost w-full p-[0.5rem] text-[0.8rem]"
              >
                {t('game.epiloguePublishAsIs') as string}
              </button>
              <button
                onClick={onSkip}
                className="btn-ghost w-full p-[0.4rem] text-[0.65rem] opacity-50"
              >
                {t('game.keepPrivate') as string}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSkip}
                className="btn-ghost w-full p-[0.5rem] text-[0.75rem]"
              >
                {t('game.epilogueContinue') as string}
              </button>
              <p className="font-mono text-[0.5rem] text-ink-2 tracking-wide">
                {t('game.tooFewMessages') as string} ({icPostCount}/{MIN_IC_POSTS})
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
