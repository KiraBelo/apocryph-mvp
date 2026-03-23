'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FilterSelectProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export default function FilterSelect({ value, onChange, options, placeholder, className = '' }: FilterSelectProps) {
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

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`select-base w-full flex items-center justify-between gap-2 cursor-pointer ${open ? '!border-accent' : ''} ${!selected ? 'text-ink-3' : ''}`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {selected ? selected.label : placeholder ?? '—'}
        </span>
        <ChevronDown size={12} strokeWidth={2} className={`shrink-0 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+2px)] left-0 right-0 z-100 bg-surface border border-accent dropdown-shadow">
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`block w-full py-[0.4rem] px-3 border-none font-body text-[0.88rem] text-left cursor-pointer transition-[background,color] duration-100
                ${!value ? 'bg-accent-dim text-accent' : 'bg-transparent text-ink-3 hover:bg-accent hover:text-white'}`}
            >
              {placeholder}
            </button>
          )}
          {options.map(o => (
            <button
              type="button"
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`block w-full py-[0.4rem] px-3 border-none font-body text-[0.88rem] text-left cursor-pointer transition-[background,color] duration-100
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
