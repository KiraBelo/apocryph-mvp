'use client'
import { useSettings, useT } from '../SettingsContext'
import Modal from './Modal'
import { useToast } from '../ToastProvider'
import type { Participant } from './types'

interface SettingsModalProps {
  gameId: string
  game: { ooc_enabled: boolean }
  me: Participant
  partner: Participant | undefined
  nickname: string
  setNickname: (v: string) => void
  avatarUrl: string
  setAvatarUrl: (v: string) => void
  bannerUrl: string
  setBannerUrl: (v: string) => void
  bannerPref: 'own' | 'partner' | 'none'
  setBannerPref: (v: 'own' | 'partner' | 'none') => void
  oocEnabled: boolean
  setOocEnabled: (v: boolean) => void
  onSettingsSaved: (nickname: string, avatarUrl: string) => void
  onClose: () => void
}

export default function SettingsModal({
  gameId, me,
  nickname, setNickname, avatarUrl, setAvatarUrl,
  bannerUrl, setBannerUrl, bannerPref, setBannerPref,
  oocEnabled, setOocEnabled,
  onSettingsSaved, onClose,
}: SettingsModalProps) {
  const { notesEnabled, gameLayout, set } = useSettings()
  const t = useT()
  const { addToast } = useToast()

  async function saveSettings() {
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banner_url: bannerUrl, banner_pref: bannerPref, nickname, avatar_url: avatarUrl, ooc_enabled: oocEnabled }),
      })
      if (!res.ok) {
        addToast(t('errors.networkError') as string, 'error')
        return
      }
      onSettingsSaved(nickname, avatarUrl)
      onClose()
    } catch {
      addToast(t('errors.networkError') as string, 'error')
    }
  }

  return (
    <Modal onClose={onClose} title={t('game.settingsTitle') as string} wide>
      <div className="flex flex-col gap-5">
        {/* ── Character ── */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-2 border-b border-edge pb-1">{t('game.characterSection') as string}</span>
          <label className="flex flex-col gap-[0.3rem]">
            <span className="font-mono text-[0.62rem] tracking-[0.1em] text-ink-2">{t('game.nicknameLabel') as string}</span>
            <input value={nickname} onChange={e => setNickname(e.target.value)} className="bg-surface-2 border border-edge text-ink font-body text-[0.95rem] p-[0.45rem_0.7rem] outline-none" maxLength={50} />
          </label>
          <label className="flex flex-col gap-[0.3rem]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.62rem] tracking-[0.1em] text-ink-2">{t('game.avatarLabel') as string}</span>
              {avatarUrl && /^https?:\/\//i.test(avatarUrl.trim()) && (
                <div className="w-9 h-9 rounded-full border border-edge shrink-0" style={{ backgroundImage: `url(${avatarUrl.trim().replace(/[()'"\\]/g, '')})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              )}
            </div>
            <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="bg-surface-2 border border-edge text-ink font-body text-[0.95rem] p-[0.45rem_0.7rem] outline-none" placeholder="https://..." maxLength={512} />
          </label>
        </div>

        {/* ── Appearance ── */}
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-2 border-b border-edge pb-1">{t('game.decorSection') as string}</span>
          <div className="flex flex-col gap-[0.3rem]">
            <span className="font-mono text-[0.62rem] tracking-[0.1em] text-ink-2">{t('game.layoutLabel') as string}</span>
            <div className="flex gap-2">
              {([['dialog', t('game.layoutDialog') as string], ['feed', t('game.layoutFeed') as string], ['book', t('game.layoutBook') as string]] as const).map(([val, label]) => (
                <button key={val} onClick={() => set('gameLayout', val as 'dialog' | 'feed' | 'book')} className={`game-sp-layout-btn text-[0.95rem] p-[0.45rem_0.5rem] ${gameLayout === val ? 'game-sp-layout-btn-active' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="font-mono text-[0.5rem] tracking-[0.04em] text-ink-2">
              {gameLayout === 'dialog' && t('game.layoutDialogDesc') as string}
              {gameLayout === 'feed' && t('game.layoutFeedDesc') as string}
              {gameLayout === 'book' && t('game.layoutBookDesc') as string}
            </p>
          </div>
          <label className="flex flex-col gap-[0.3rem]">
            <span className="font-mono text-[0.62rem] tracking-[0.1em] text-ink-2">{t('game.bannerLabel') as string}</span>
            <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} className="bg-surface-2 border border-edge text-ink font-body text-[0.95rem] p-[0.45rem_0.7rem] outline-none" placeholder="https://..." maxLength={512} />
            {bannerUrl && /^https?:\/\//i.test(bannerUrl.trim()) && (
              <div className="w-full h-12 border border-edge mt-1" style={{ backgroundImage: `url(${bannerUrl.trim().replace(/[()'"\\]/g, '')})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            )}
          </label>
          <div className="flex gap-3">
            {([['own', t('game.bannerOwn') as string], ['partner', t('game.bannerPartner') as string], ['none', t('game.bannerNone') as string]] as const).map(([val, label]) => (
              <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="banner_pref" checked={bannerPref === val} onChange={() => setBannerPref(val as 'own' | 'partner' | 'none')} className="w-[13px] h-[13px] shrink-0 accent-muted" />
                <span className="font-mono text-[0.7rem] text-ink">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-2 border-b border-edge pb-1">{t('game.tabsSection') as string}</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={oocEnabled} onChange={e => setOocEnabled(e.target.checked)} className="w-[14px] h-[14px] shrink-0 accent-muted" />
            <span className="font-mono text-[0.7rem] text-ink">{t('game.oocTab') as string}</span>
            <span className="font-mono text-[0.55rem] text-ink-2">{t('game.oocDesc') as string}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notesEnabled} onChange={e => set('notesEnabled', e.target.checked)} className="w-[14px] h-[14px] shrink-0 accent-muted" />
            <span className="font-mono text-[0.7rem] text-ink">{t('game.notesTab') as string}</span>
            <span className="font-mono text-[0.55rem] text-ink-2">{t('game.notesDesc') as string}</span>
          </label>
        </div>

        <button onClick={saveSettings} className="btn-primary p-[0.6rem_1.2rem] text-[0.95rem] w-full">
          {t('game.saveSettings') as string}
        </button>
      </div>
    </Modal>
  )
}
