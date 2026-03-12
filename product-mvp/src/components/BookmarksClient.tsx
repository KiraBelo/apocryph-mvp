'use client'
import RequestCard, { Request } from './RequestCard'
import { useT } from './SettingsContext'

interface Props {
  requests: Request[]
}

export default function BookmarksClient({ requests }: Props) {
  const t = useT()

  return (
    <div className="max-w-[1050px] mx-auto p-[3rem_1.75rem]">
      <p className="section-label text-accent-2 mb-2">{t('bookmarks.sectionLabel') as string}</p>
      <h1 className="font-heading text-[clamp(1.8rem,4vw,2.8rem)] italic font-light text-ink mb-10">
        {t('bookmarks.title') as string} <span className="font-mono text-[0.9rem] text-ink-2">({requests.length}/50)</span>
      </h1>

      {requests.length === 0 && (
        <p className="text-ink-2 font-heading italic text-[1.1rem]">
          {t('bookmarks.empty') as string}
        </p>
      )}

      <div className="grid gap-[var(--game-gap,1rem)]">
        {requests.map(r => <RequestCard key={r.id} request={r} isBookmarked />)}
      </div>
    </div>
  )
}
