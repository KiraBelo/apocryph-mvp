'use client'

import Link from 'next/link'
import { useT } from './SettingsContext'

export default function NotFoundClient() {
  const t = useT()
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-8 text-center">
      <div>
        <p className="section-label text-accent-2 mb-4">
          § 404
        </p>
        <h1 className="font-heading text-[clamp(2rem,6vw,3.5rem)] italic font-light text-ink mb-4">
          {t('notFoundPage.title') as string}
        </h1>
        <p className="text-ink-2 font-body text-[1.05rem] max-w-[400px] mx-auto mb-8">
          {t('notFoundPage.description') as string}
        </p>
        <Link href="/" className="font-heading italic text-[1rem] text-accent border-b border-current">
          {t('notFoundPage.backHome') as string}
        </Link>
      </div>
    </div>
  )
}
