'use client'
import { useT } from '../SettingsContext'
import { MIN_IC_POSTS } from './types'

interface StatusBannersProps {
  gameStatus: string
  isLeft: boolean
  isFrozen: boolean
  moderationStatus?: string
  myFinishConsent: boolean
  partnerFinishConsent: boolean
  myPublishConsent: boolean
  partnerPublishConsent: boolean
  icPostCount: number
  finishLoading: boolean
  publishLoading: boolean
  publishLoaded: boolean
  onFinishConsent: (consent: boolean) => void
  onReopen: () => void
  onPublishConsent: (consent: boolean) => void
}

export default function StatusBanners({
  gameStatus, isLeft, isFrozen, moderationStatus,
  myFinishConsent, partnerFinishConsent,
  myPublishConsent, partnerPublishConsent,
  icPostCount, finishLoading, publishLoading, publishLoaded,
  onFinishConsent, onReopen, onPublishConsent,
}: StatusBannersProps) {
  const t = useT()
  const isFinished = gameStatus === 'finished'
  const isPublished = isFinished && publishLoaded && myPublishConsent && partnerPublishConsent

  return (
    <>
      {/* Moderation banner */}
      {isFrozen && (
        <div className="px-6 py-2 text-center border-b border-edge font-mono text-[0.7rem] text-ink-2 tracking-wide" style={{ background: 'var(--bg-2)' }}>
          {moderationStatus === 'hidden'
            ? t('admin.gameHiddenBanner') as string
            : t('admin.gameResolvedBanner') as string}
        </div>
      )}

      {/* Partner wants to finish (I haven't agreed yet) */}
      {!isFinished && !isLeft && partnerFinishConsent && !myFinishConsent && (
        <div className="px-6 py-1.5 flex items-center justify-center gap-3 border-b border-edge font-mono text-[0.7rem] text-ink-2 tracking-wide" style={{ background: 'var(--bg-2)' }}>
          <span>{t('game.partnerReadyToFinish') as string}</span>
          <button
            disabled={finishLoading}
            onClick={() => onFinishConsent(true)}
            className="btn-primary p-[0.2rem_0.6rem] text-[0.65rem]"
          >
            {t('game.finishToo') as string}
          </button>
        </div>
      )}

      {/* Published — single combined banner (no need for separate "finished" banner) */}
      {isPublished && !isLeft && (
        <div className="px-6 py-1.5 flex items-center justify-center gap-4 border-b border-edge font-mono text-[0.7rem] tracking-wide" style={{ background: 'var(--bg-2)' }}>
          <span className="text-ink-2">{t('game.gamePublished') as string}</span>
          <button
            disabled={publishLoading}
            onClick={() => onPublishConsent(false)}
            className="btn-ghost p-[0.2rem_0.6rem] text-[0.65rem]"
          >
            {t('game.revokePublish') as string}
          </button>
          <span className="text-ink-2 opacity-50">·</span>
          <button
            disabled={finishLoading}
            onClick={onReopen}
            className="btn-ghost p-[0.2rem_0.6rem] text-[0.65rem]"
          >
            {t('game.reopen') as string}
          </button>
        </div>
      )}

      {/* Finished but NOT published — simple banner with reopen */}
      {isFinished && !isPublished && !isLeft && (
        <div className="px-6 py-1.5 flex items-center justify-center gap-3 border-b border-edge font-mono text-[0.7rem] text-ink-2 tracking-wide" style={{ background: 'var(--bg-2)' }}>
          <span>{t('game.gameFinished') as string}</span>
          <button
            disabled={finishLoading}
            onClick={onReopen}
            className="btn-ghost p-[0.2rem_0.6rem] text-[0.65rem]"
          >
            {t('game.reopen') as string}
          </button>
        </div>
      )}

      {/* Partner wants to publish (I haven't agreed yet) */}
      {isFinished && !isPublished && !isLeft && publishLoaded && partnerPublishConsent && !myPublishConsent && icPostCount >= MIN_IC_POSTS && (
        <div className="px-6 py-1.5 flex items-center justify-center gap-3 border-b border-edge font-mono text-[0.7rem] text-ink-2 tracking-wide" style={{ background: 'var(--bg-2)' }}>
          <span>{t('game.partnerWantsPublish') as string}</span>
          <button
            disabled={publishLoading}
            onClick={() => onPublishConsent(true)}
            className="btn-primary p-[0.2rem_0.6rem] text-[0.65rem]"
          >
            {t('game.publishToo') as string}
          </button>
        </div>
      )}
    </>
  )
}
