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
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

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
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

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

  return (
    <div ref={ref} className={wrapperClass}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
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
          {variant === 'select' && placeholder && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`${optionClassBase}
                ${!value ? 'bg-accent-dim text-accent' : 'bg-transparent text-ink-3 hover:bg-accent hover:text-white'}`}
            >
              {placeholder}
            </button>
          )}
          {options.map(o => (
            <button
              type="button"
              role="option"
              aria-selected={o.value === value}
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`${optionClassBase}
                ${o.value === value ? 'bg-accent-dim text-accent' : 'bg-transparent text-ink hover:bg-accent hover:text-white'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
