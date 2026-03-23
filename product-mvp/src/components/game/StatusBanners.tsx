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
        <div className="game-banner game-banner-muted">
          {moderationStatus === 'hidden'
            ? t('admin.gameHiddenBanner') as string
            : t('admin.gameResolvedBanner') as string}
        </div>
      )}

      {/* Partner proposes publish — slim action bar */}
      {!isLeft && partnerWantsPublish && (
        <div className="game-banner">
          <span>{t('game.publishBannerQuestion') as string}</span>
          <button
            disabled={publishLoading}
            onClick={onOpenPublishModal}
            className="game-banner-btn"
          >
            {t('game.publishToo') as string}
          </button>
        </div>
      )}
    </>
  )
}
