'use client'
import { useT } from '@/components/SettingsContext'

export default function Error({ reset }: { reset: () => void }) {
  const t = useT()
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-8 text-center">
      <div>
        <p className="section-label text-accent-2 mb-4">
          {t('errors.errorPageLabel') as string}
        </p>
        <h1 className="font-heading text-[clamp(2rem,6vw,3.5rem)] italic font-light text-ink mb-4">
          {t('errors.errorPageTitle') as string}
        </h1>
        <p className="text-ink-2 font-body text-[1.05rem] max-w-[400px] mx-auto mb-5">
          {t('errors.errorPageDescription') as string}
        </p>
        <button onClick={reset} className="font-heading italic text-[1rem] text-accent border-b border-current bg-transparent cursor-pointer">
          {t('errors.errorPageRetry') as string}
        </button>
      </div>
    </div>
  )
}
