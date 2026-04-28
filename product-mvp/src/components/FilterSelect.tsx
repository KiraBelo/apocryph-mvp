'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FilterSelectProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  /** `select` — форма заявки (мелкие селекты). `filter` — лента/библиотека (крупные фильтры с min-width). */
  variant?: 'select' | 'filter'
}

export default function FilterSelect({
  value, onChange, options, placeholder, className = '', variant = 'select',
}: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  // HIGH-U3 (audit-v4): keyboard navigation. `activeIndex` is the
  // currently highlighted option in the dropdown — controlled by
  // ArrowUp/ArrowDown/Home/End, committed by Enter.
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const selected = options.find(o => o.value === value)

  // Synthetic option list: when the trigger uses a placeholder, the first
  // entry is the "clear" choice (only in `select` variant), exactly as
  // rendered below.
  const showClearRow = variant === 'select' && !!placeholder
  const navOptions = showClearRow
    ? [{ value: '', label: placeholder! }, ...options]
    : options

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { setOpen(false); setActiveIndex(-1); buttonRef.current?.focus() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function openDropdown() {
    // Highlight the currently selected option (or first row) when opening.
    // Done here instead of in a useEffect so React doesn't have to do an
    // extra render pass before the user sees focus on the right row.
    const selectedIdx = navOptions.findIndex(o => o.value === value)
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0)
    setOpen(true)
  }

  function closeDropdown() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function commitOption(idx: number) {
    const opt = navOptions[idx]
    if (!opt) return
    onChange(opt.value)
    closeDropdown()
    buttonRef.current?.focus()
  }

  function onTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      if (!open) {
        e.preventDefault()
        openDropdown()
      }
    }
  }

  function onListKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(navOptions.length - 1, i < 0 ? 0 : i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(0, i < 0 ? 0 : i - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(navOptions.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (activeIndex >= 0) commitOption(activeIndex)
    }
  }

  const buttonClass = variant === 'filter'
    ? `filter-input w-full flex items-center justify-between gap-2 cursor-pointer pr-3.5 ${open ? 'border-accent' : ''}`
    : `select-base w-full flex items-center justify-between gap-2 cursor-pointer ${open ? '!border-accent' : ''} ${!selected ? 'text-ink-3' : ''}`

  const optionClassBase = variant === 'filter'
    ? 'block w-full py-[0.45rem] px-3 border-none font-body text-[0.9rem] text-left cursor-pointer transition-[background,color] duration-100'
    : 'block w-full py-[0.4rem] px-3 border-none font-body text-[0.88rem] text-left cursor-pointer transition-[background,color] duration-100'

  const wrapperClass = variant === 'filter'
    ? `relative min-w-[130px] ${className}`
    : `relative ${className}`

  const fallbackLabel = variant === 'filter' ? (options[0]?.label ?? '—') : (placeholder ?? '—')

  function rowClass(idx: number, isCurrent: boolean) {
    const active = idx === activeIndex
    if (isCurrent) {
      return `${optionClassBase} bg-accent-dim text-accent ${active ? 'ring-1 ring-accent' : ''}`
    }
    if (active) return `${optionClassBase} bg-accent text-white`
    return `${optionClassBase} bg-transparent text-ink hover:bg-accent hover:text-white`
  }

  function clearRowClass(idx: number) {
    const active = idx === activeIndex
    if (!value) return `${optionClassBase} bg-accent-dim text-accent ${active ? 'ring-1 ring-accent' : ''}`
    if (active) return `${optionClassBase} bg-accent text-white`
    return `${optionClassBase} bg-transparent text-ink-3 hover:bg-accent hover:text-white`
  }

  return (
    <div ref={ref} className={wrapperClass} onKeyDown={open ? onListKey : undefined}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? closeDropdown() : openDropdown())}
        onKeyDown={onTriggerKey}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={buttonClass}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {selected ? selected.label : fallbackLabel}
        </span>
        <ChevronDown size={12} strokeWidth={2} className={`shrink-0 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div role="listbox" className="absolute top-[calc(100%+2px)] left-0 right-0 z-100 bg-surface border border-accent dropdown-shadow">
          {showClearRow && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => commitOption(0)}
              onMouseEnter={() => setActiveIndex(0)}
              className={clearRowClass(0)}
            >
              {placeholder}
            </button>
          )}
          {options.map((o, oi) => {
            const idx = showClearRow ? oi + 1 : oi
            return (
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                key={o.value}
                onClick={() => commitOption(idx)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={rowClass(idx, o.value === value)}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
