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

  return (
    <>
      {/* Moderation banner */}
      {isFrozen && (
        <div className="px-6 py-2 text-center bg-[#c0392b22] border-b border-[#c0392b44] font-mono text-[0.75rem] text-[#c0392b] tracking-wide">
          {moderationStatus === 'hidden'
            ? t('admin.gameHiddenBanner') as string
            : t('admin.gameResolvedBanner') as string}
        </div>
      )}

      {/* Finish banner: partner proposed */}
      {!isFinished && !isLeft && partnerFinishConsent && !myFinishConsent && (
        <div className="px-6 py-2 flex items-center justify-center gap-3 bg-accent-dim border-b border-edge font-mono text-[0.75rem] text-accent tracking-wide">
          <span>{t('game.partnerReadyToFinish') as string}</span>
          <button
            disabled={finishLoading}
            onClick={() => onFinishConsent(true)}
            className="btn-primary p-[0.25rem_0.7rem] text-[0.7rem]"
          >
            {t('game.finishToo') as string}
          </button>
        </div>
      )}

      {/* Finished banner */}
      {isFinished && !isLeft && (
        <div className="px-6 py-2 flex items-center justify-center gap-3 bg-accent-dim border-b border-edge font-mono text-[0.75rem] text-accent tracking-wide">
          <span>{t('game.gameFinished') as string}</span>
          <button
            disabled={finishLoading}
            onClick={onReopen}
            className="btn-ghost p-[0.25rem_0.7rem] text-[0.7rem]"
          >
            {t('game.reopen') as string}
          </button>
        </div>
      )}

      {/* Publish banner: partner proposed */}
      {isFinished && !isLeft && publishLoaded && partnerPublishConsent && !myPublishConsent && icPostCount >= MIN_IC_POSTS && (
        <div className="px-6 py-2 flex items-center justify-center gap-3 bg-[#27ae6022] border-b border-[#27ae6044] font-mono text-[0.75rem] text-[#27ae60] tracking-wide">
          <span>{t('game.partnerWantsPublish') as string}</span>
          <button
            disabled={publishLoading}
            onClick={() => onPublishConsent(true)}
            className="btn-primary p-[0.25rem_0.7rem] text-[0.7rem]"
          >
            {t('game.publishToo') as string}
          </button>
        </div>
      )}
    </>
  )
}
