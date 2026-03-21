// GOLD STANDARD: UI Component with skeleton loading + empty state CTA
// Based on: AdminModeration pattern after task #3/#19

'use client'
import { useState } from 'react'
import { useSettings, useT } from '@/components/SettingsContext'
import { useToast } from '@/components/ToastProvider'

interface Props {
  items: { id: string; title: string; created_at: string }[]
}

export default function ExampleList({ items: initial }: Props) {
  // 1. Always use useT() for strings, useSettings() for locale
  const t = useT()
  const { lang } = useSettings()
  const { addToast } = useToast()
  const [items, setItems] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)

  // 2. Skeleton loading state (before data arrives)
  // Use pulsing gray blocks, not text "Loading..."
  // <div className="animate-pulse bg-surface-2 h-20 rounded" />

  // 3. Empty state with CTA
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-2 font-heading italic mb-4">
          {t('example.empty') as string}
        </p>
        <a href="/create" className="btn-primary">
          {t('example.createFirst') as string}
        </a>
      </div>
    )
  }

  // 4. Date formatting — use dynamic lang, not hardcoded 'ru'
  // 5. All strings through t(), no Cyrillic in component files
  return (
    <div className="flex flex-col gap-4">
      {items.map(item => (
        <div key={item.id} className="card p-5">
          <h3 className="font-heading text-ink">{item.title}</h3>
          <p className="meta-text">{new Date(item.created_at).toLocaleDateString(lang)}</p>
        </div>
      ))}
    </div>
  )
}
