'use client'
import { useT } from '../SettingsContext'
import Modal from './Modal'

export default function ModerationSentModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <Modal onClose={onClose} title={t('game.moderationSentTitle') as string}>
      <p className="font-body text-ink mb-6">{t('game.moderationSentHint') as string}</p>
      <button onClick={onClose} className="btn-ghost p-[0.5rem_1.2rem] text-[0.9rem]">
        OK
      </button>
    </Modal>
  )
}
