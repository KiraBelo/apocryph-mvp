'use client'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../SettingsContext'
import type { GameStatus } from '@/types/api'

interface StatusChipProps {
  gameStatus: GameStatus
  isFrozen: boolean
  isLeft: boolean
  partnerWantsPublish: boolean
  publishLoading: boolean
  onProposePublish: () => void
  onPublishResponse: (choice: 'publish_as_is' | 'edit_first' | 'decline') => void
  onRevoke: () => void
  onSubmitToModeration: () => void
}

const chipBase = 'font-mono text-[0.6rem] tracking-[0.1em] uppercase border border-edge px-[0.5rem] py-[0.2rem] cursor-pointer select-none shrink-0 relative'

export default function StatusChip({
  gameStatus, isFrozen, isLeft,
  partnerWantsPublish,
  publishLoading,
  onProposePublish, onPublishResponse, onRevoke, onSubmitToModeration,
}: StatusChipProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const skipCloseRef = useRef(false)

  if (isLeft) return null

  // Admin freeze takes priority
  if (isFrozen) {
    return (
      <span className={`${chipBase} text-ink-2`} style={{ cursor: 'default' }}>
        {t('game.chipFrozen') as string}
      </span>
    )
  }

  // On moderation — static label
  if (gameStatus === 'moderation') {
    return (
      <span className={`${chipBase} text-ink-2`} style={{ cursor: 'default' }}>
        {t('game.chipModeration') as string}
      </span>
    )
  }

  // Published — dropdown to revoke
  if (gameStatus === 'published') {
    return (
      <div className="relative shrink-0">
        <button
          className={`${chipBase} text-accent`}
          onClick={() => {
            if (skipCloseRef.current) { skipCloseRef.current = false; return }
            setOpen(o => !o)
          }}
        >
          {t('game.chipPublished') as string} ▾
        </button>
        {open && (
          <DropdownMenu onClose={() => setOpen(false)} skipCloseRef={skipCloseRef}>
            <DropItem
              label={t('game.chipRevoke') as string}
              onClick={() => { setOpen(false); onRevoke() }}
              disabled={publishLoading}
            />
          </DropdownMenu>
        )}
      </div>
    )
  }

  // Preparing — dropdown: submit to moderation or revoke
  if (gameStatus === 'preparing') {
    return (
      <div className="relative shrink-0">
        <button
          className={`${chipBase} text-ink`}
          onClick={() => {
            if (skipCloseRef.current) { skipCloseRef.current = false; return }
            setOpen(o => !o)
          }}
        >
          {t('game.chipPreparing') as string} ▾
        </button>
        {open && (
          <DropdownMenu onClose={() => setOpen(false)} skipCloseRef={skipCloseRef}>
            <DropItem
              label={t('game.chipSubmit') as string}
              onClick={() => { setOpen(false); onSubmitToModeration() }}
              disabled={publishLoading}
            />
            <DropItem
              label={t('game.chipRevoke') as string}
              onClick={() => { setOpen(false); onRevoke() }}
              disabled={publishLoading}
            />
          </DropdownMenu>
        )}
      </div>
    )
  }

  // Active + partner wants to publish — action chip with dot
  if (gameStatus === 'active' && partnerWantsPublish) {
    return (
      <div className="relative shrink-0">
        <button
          className={`${chipBase} text-accent`}
          onClick={() => {
            if (skipCloseRef.current) { skipCloseRef.current = false; return }
            setOpen(o => !o)
          }}
        >
          {t('game.chipPublishRequest') as string} ▾
          <span className="ml-[0.3em] inline-block w-[5px] h-[5px] rounded-full align-middle" style={{ background: 'var(--accent)', marginBottom: '1px' }} />
        </button>
        {open && (
          <DropdownMenu onClose={() => setOpen(false)} skipCloseRef={skipCloseRef}>
            <DropItem
              label={t('game.publishAsIs') as string}
              onClick={() => { setOpen(false); onPublishResponse('publish_as_is') }}
              disabled={publishLoading}
            />
            <DropItem
              label={t('game.editFirst') as string}
              onClick={() => { setOpen(false); onPublishResponse('edit_first') }}
              disabled={publishLoading}
            />
            <DropItem
              label={t('game.keepPrivate') as string}
              onClick={() => { setOpen(false); onPublishResponse('decline') }}
              disabled={publishLoading}
            />
          </DropdownMenu>
        )}
      </div>
    )
  }

  // Active, no events — no chip
  return null
}

function DropdownMenu({ children, onClose, skipCloseRef }: {
  children: React.ReactNode
  onClose: () => void
  skipCloseRef: React.RefObject<boolean>
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Click-outside via document listener (skipCloseRef pattern per CLAUDE.md)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && ref.current.contains(e.target as Node)) return
      skipCloseRef.current = true
      onCloseRef.current()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-[2px] min-w-[160px] border border-edge bg-surface z-50 flex flex-col"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
    >
      {children}
    </div>
  )
}

function DropItem({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-mono text-[0.62rem] tracking-[0.08em] text-ink px-[0.8rem] py-[0.5rem] text-left bg-transparent border-none cursor-pointer disabled:opacity-40 hover:bg-surface-2 w-full"
    >
      {label}
    </button>
  )
}
