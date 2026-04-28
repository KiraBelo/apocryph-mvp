'use client'
import { useEffect, useRef } from 'react'
import { useT } from './SettingsContext'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const t = useT()
  const resolvedConfirmLabel = confirmLabel ?? (t('common.ok') as string)
  const resolvedCancelLabel = cancelLabel ?? (t('common.cancel') as string)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // Focus trap: danger -> focus Cancel, otherwise focus Confirm
    if (danger) cancelRef.current?.focus()
    else confirmRef.current?.focus()
  }, [open, danger])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  // HIGH-U2 (audit-v4): cycle Tab between Cancel and Confirm so focus
  // can never leak back to the page underneath while the modal is open.
  function handleTrap(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return
    const cancel = cancelRef.current
    const confirm = confirmRef.current
    if (!cancel || !confirm) return
    const active = document.activeElement
    if (e.shiftKey) {
      if (active === cancel) { e.preventDefault(); confirm.focus() }
    } else {
      if (active === confirm) { e.preventDefault(); cancel.focus() }
    }
  }

  if (!open) return null

  return (
    <div className="overlay fixed inset-0 z-[9000] flex items-center justify-center" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="modal p-6 max-w-[420px] w-full mx-4"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleTrap}
      >
        <h3 id="confirm-dialog-title" className="section-label mb-3">{title}</h3>
        <p id="confirm-dialog-message" className="font-body text-[0.9rem] text-ink mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="btn-ghost text-[0.8rem] px-4 py-1.5"
          >
            {resolvedCancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="btn-primary text-[0.8rem] px-4 py-1.5"
            style={danger ? { background: '#c0392b' } : undefined}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
