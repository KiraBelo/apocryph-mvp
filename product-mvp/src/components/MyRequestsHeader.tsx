'use client'

import Link from 'next/link'
import { useT } from './SettingsContext'

export default function MyRequestsHeader() {
  const t = useT()
  return (
    <div className="flex justify-between items-baseline mb-10">
      <div>
        <p className="section-label text-accent-2 mb-2">{t('myRequests.sectionLabel') as string}</p>
        <h1 className="font-heading text-[clamp(1.8rem,4vw,2.8rem)] italic font-light text-ink">{t('myRequests.title') as string}</h1>
      </div>
      <Link href="/requests/new" className="btn-primary text-[0.95rem] py-[0.55rem] px-5 no-underline">
        {t('myRequests.create') as string}
      </Link>
    </div>
  )
}
