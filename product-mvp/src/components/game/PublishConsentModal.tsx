'use client'
import { useT } from '../SettingsContext'
import Modal from './Modal'

interface PublishConsentModalProps {
  loading: boolean
  onChoice: (choice: 'publish_as_is' | 'edit_first' | 'decline') => void
  onClose: () => void
}

export default function PublishConsentModal({ loading, onChoice, onClose }: PublishConsentModalProps) {
  const t = useT()
  return (
    <Modal onClose={onClose} title={t('game.partnerWantsPublish') as string}>
      <p className="font-mono text-[0.7rem] text-ink-2 tracking-[0.04em] mb-6">
        {t('game.publishConsentWarning') as string}
      </p>
      <div className="flex flex-col gap-3">
        <button
          disabled={loading}
          onClick={() => onChoice('publish_as_is')}
          className="btn-primary p-[0.6rem_1.2rem] text-[0.9rem] text-left"
        >
          {t('game.publishAsIs') as string}
        </button>
        <button
          disabled={loading}
          onClick={() => onChoice('edit_first')}
          className="btn-ghost p-[0.6rem_1.2rem] text-[0.9rem] text-left"
        >
          {t('game.editFirst') as string}
        </button>
        <button
          disabled={loading}
          onClick={() => onChoice('decline')}
          className="btn-ghost p-[0.6rem_1.2rem] text-[0.9rem] text-left opacity-70"
        >
          {t('game.keepPrivate') as string}
        </button>
      </div>
    </Modal>
  )
}
