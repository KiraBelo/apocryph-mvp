'use client'
import { useT } from '../SettingsContext'

interface StatusBannersProps {
  isFrozen: boolean
  moderationStatus?: string
  isLeft: boolean
  partnerWantsPublish: boolean
  publishLoading: boolean
  onOpenPublishModal: () => void
}

export default function StatusBanners({
  isFrozen, moderationStatus, isLeft,
  partnerWantsPublish, publishLoading, onOpenPublishModal,
}: StatusBannersProps) {
  const t = useT()

  return (
    <>
      {/* Moderation freeze banner */}
      {isFrozen && (
        <div className="px-6 py-2 text-center border-b border-edge font-mono text-[0.7rem] text-ink-2 tracking-wide" style={{ background: 'var(--bg-2)' }}>
          {moderationStatus === 'hidden'
            ? t('admin.gameHiddenBanner') as string
            : t('admin.gameResolvedBanner') as string}
        </div>
      )}

      {/* Partner proposes publish — slim action bar */}
      {!isLeft && partnerWantsPublish && (
        <div className="px-6 py-1.5 flex items-center justify-center gap-3 border-b border-edge font-mono text-[0.7rem] text-ink-2 tracking-wide" style={{ background: 'var(--bg-2)' }}>
          <span>{t('game.partnerWantsPublish') as string}</span>
          <button
            disabled={publishLoading}
            onClick={onOpenPublishModal}
            className="btn-primary p-[0.2rem_0.6rem] text-[0.65rem]"
          >
            {t('game.publishToo') as string}
          </button>
        </div>
      )}
    </>
  )
}
