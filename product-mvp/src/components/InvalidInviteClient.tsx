'use client'

import { useT } from './SettingsContext'

export default function InvalidInviteClient() {
  const t = useT()
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-8 text-center">
      <div>
        <h1 className="font-heading text-[2rem] italic text-ink mb-4">{t('invite.invalidTitle') as string}</h1>
        <p className="text-ink-2 font-body">{t('invite.invalidDescription') as string}</p>
      </div>
    </div>
  )
}
