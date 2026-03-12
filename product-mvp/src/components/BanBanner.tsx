'use client'
import { useT } from './SettingsContext'

interface Props {
  reason: string | null
}

export default function BanBanner({ reason }: Props) {
  const t = useT()

  return (
    <div className="bg-[#c0392b] text-white text-center py-2 px-4 font-mono text-[0.78rem] tracking-wide">
      {t('ban.banner') as string}{reason ? `: ${reason}` : ''}
      {'. '}
      {t('ban.bannerDetail') as string}
    </div>
  )
}
