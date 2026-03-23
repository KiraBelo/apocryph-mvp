'use client'

import Link from 'next/link'
import { useT } from './SettingsContext'

export default function MyRequestsHeader() {
  const t = useT()
  return (
    <div className="mb-6">
      <div className="flex justify-between items-baseline gap-4">
        <h1 className="page-title">{t('myRequests.title') as string}</h1>
        <Link href="/requests/new" className="btn-primary text-[0.95rem] py-[0.55rem] px-5 no-underline shrink-0">
          {t('myRequests.create') as string}
        </Link>
      </div>
    </div>
  )
}
