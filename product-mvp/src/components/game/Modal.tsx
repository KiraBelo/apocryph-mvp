import React, { useEffect, useId, useRef } from 'react'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function Modal({ onClose, title, children, wide }: { onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const titleId = useId()
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Save previously focused element and focus first focusable in modal
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    const first = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
    return () => { previousFocusRef.current?.focus() }
  }, [])

  // Escape key handler
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Focus trap
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const modal = modalRef.current
      if (!modal) return
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="overlay z-[500] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal p-8 w-full max-h-[calc(100vh-2rem)] overflow-y-auto ${wide ? 'max-w-[680px]' : 'max-w-[480px]'}`}
      >
        <button onClick={onClose} aria-label="Close" className="sticky top-0 float-right bg-transparent border-none text-ink-2 cursor-pointer text-[1.1rem] z-10">&#10005;</button>
        <h2 id={titleId} className="font-heading text-2xl italic text-ink mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}
