'use client'
import { useSettings, useT } from '../SettingsContext'
import Modal from './Modal'
import { MIN_IC_POSTS } from './types'
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
  isFinished: boolean
  isLeft: boolean
  gameStatus: string
  setGameStatus: (v: string) => void
  myFinishConsent: boolean
  setMyFinishConsent: (v: boolean) => void
  partnerFinishConsent: boolean
  myPublishConsent: boolean
  setMyPublishConsent: (v: boolean) => void
  partnerPublishConsent: boolean
  setPartnerPublishConsent: (v: boolean) => void
  publishLoaded: boolean
  setPublishLoaded: (v: boolean) => void
  icPostCount: number
  finishLoading: boolean
  setFinishLoading: (v: boolean) => void
  publishLoading: boolean
  setPublishLoading: (v: boolean) => void
  onSettingsSaved: (nickname: string, avatarUrl: string) => void
  onClose: () => void
}

export default function SettingsModal({
  gameId, game, me, partner,
  nickname, setNickname, avatarUrl, setAvatarUrl,
  bannerUrl, setBannerUrl, bannerPref, setBannerPref,
  oocEnabled, setOocEnabled,
  isFinished, isLeft, gameStatus, setGameStatus,
  myFinishConsent, setMyFinishConsent, partnerFinishConsent,
  myPublishConsent, setMyPublishConsent, partnerPublishConsent, setPartnerPublishConsent,
  publishLoaded, setPublishLoaded, icPostCount,
  finishLoading, setFinishLoading, publishLoading, setPublishLoading,
  onSettingsSaved, onClose,
}: SettingsModalProps) {
  const { notesEnabled, gameLayout, set } = useSettings()
  const t = useT()

  async function saveSettings() {
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banner_url: bannerUrl, banner_pref: bannerPref, nickname, avatar_url: avatarUrl, ooc_enabled: oocEnabled }),
      })
      if (!res.ok) {
        alert(t('errors.networkError') as string)
        return
      }
      onSettingsSaved(nickname, avatarUrl)
      onClose()
    } catch {
      alert(t('errors.networkError') as string)
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
                <button key={val} onClick={() => set('gameLayout', val as 'dialog' | 'feed' | 'book')} className="flex-1 font-heading italic text-[0.95rem] border p-[0.45rem_0.5rem] cursor-pointer transition-all duration-150" style={{ background: gameLayout === val ? 'var(--accent-dim)' : 'var(--bg-2)', borderColor: gameLayout === val ? 'var(--accent)' : 'var(--border)', color: gameLayout === val ? 'var(--accent)' : 'var(--text)' }}>
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
                <input type="radio" name="banner_pref" checked={bannerPref === val} onChange={() => setBannerPref(val as 'own' | 'partner' | 'none')} className="w-[13px] h-[13px] shrink-0" style={{ accentColor: 'var(--text-2)' }} />
                <span className="font-mono text-[0.7rem] text-ink">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-2 border-b border-edge pb-1">{t('game.tabsSection') as string}</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={oocEnabled} onChange={e => setOocEnabled(e.target.checked)} className="w-[14px] h-[14px] shrink-0" style={{ accentColor: 'var(--text-2)' }} />
            <span className="font-mono text-[0.7rem] text-ink">{t('game.oocTab') as string}</span>
            <span className="font-mono text-[0.55rem] text-ink-2">{t('game.oocDesc') as string}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notesEnabled} onChange={e => set('notesEnabled', e.target.checked)} className="w-[14px] h-[14px] shrink-0" style={{ accentColor: 'var(--text-2)' }} />
            <span className="font-mono text-[0.7rem] text-ink">{t('game.notesTab') as string}</span>
            <span className="font-mono text-[0.55rem] text-ink-2">{t('game.notesDesc') as string}</span>
          </label>
        </div>

        {/* ── Manage (finish/publish) ── */}
        {!isLeft && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-ink-2 border-b border-edge pb-1">{t('game.manageSection') as string}</span>

            {/* Finish checkbox — always visible */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFinished || myFinishConsent}
                disabled={finishLoading}
                onChange={async e => {
                  const newVal = e.target.checked
                  setFinishLoading(true)
                  if (isFinished && !newVal) {
                    // Reopen
                    const res = await fetch(`/api/games/${gameId}/finish`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'reopen' })
                    })
                    const data = await res.json().catch(() => ({}))
                    if (data.ok) {
                      setGameStatus('active')
                      setMyFinishConsent(false)
                      setMyPublishConsent(false)
                      setPartnerPublishConsent(false)
                      setPublishLoaded(false)
                    }
                  } else {
                    // Toggle consent
                    const res = await fetch(`/api/games/${gameId}/finish`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ consent: newVal })
                    })
                    const data = await res.json().catch(() => ({}))
                    if (data.ok) {
                      setMyFinishConsent(newVal)
                      if (data.finished) setGameStatus('finished')
                    }
                  }
                  setFinishLoading(false)
                }}
                className="w-[14px] h-[14px] shrink-0" style={{ accentColor: 'var(--text-2)' }}
              />
              <span className="font-mono text-[0.7rem] text-ink">{t('game.readyToFinish') as string}</span>
            </label>
            <p className="font-mono text-[0.55rem] text-ink-2 ml-5">
              {isFinished
                ? `✓ ${t('game.gameFinished') as string}`
                : partnerFinishConsent
                  ? `✓ ${t('game.partnerReadyToFinish') as string}`
                  : t('game.partnerNotReady') as string}
            </p>

            {/* Publish — button instead of checkbox */}
            {isFinished && publishLoaded && icPostCount >= MIN_IC_POSTS && (
              myPublishConsent && partnerPublishConsent ? (
                /* Published — can revoke */
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[0.55rem] text-ink-2">✓ {t('game.gamePublished') as string}</span>
                  <button
                    disabled={publishLoading}
                    onClick={async () => {
                      setPublishLoading(true)
                      const res = await fetch(`/api/games/${gameId}/publish-consent`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ consent: false })
                      })
                      if (res.ok) setMyPublishConsent(false)
                      setPublishLoading(false)
                    }}
                    className="btn-ghost p-[0.2rem_0.5rem] text-[0.6rem]"
                  >
                    {t('game.revokePublish') as string}
                  </button>
                </div>
              ) : myPublishConsent ? (
                /* I proposed, waiting for partner */
                <p className="font-mono text-[0.55rem] text-ink-2 mt-1">
                  ✓ {t('game.publishToLibrary') as string} — {t('game.partnerNotReady') as string}
                </p>
              ) : partnerPublishConsent ? (
                /* Partner proposed, I can agree */
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[0.55rem] text-ink-2">
                    {t('game.partnerWantsPublish') as string}
                  </span>
                  <button
                    disabled={publishLoading}
                    onClick={async () => {
                      setPublishLoading(true)
                      const res = await fetch(`/api/games/${gameId}/publish-consent`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ consent: true })
                      })
                      if (res.ok) setMyPublishConsent(true)
                      setPublishLoading(false)
                    }}
                    className="btn-primary p-[0.2rem_0.5rem] text-[0.6rem]"
                  >
                    {t('game.publishToo') as string}
                  </button>
                </div>
              ) : (
                /* Nobody proposed yet */
                <button
                  disabled={publishLoading}
                  onClick={async () => {
                    setPublishLoading(true)
                    const res = await fetch(`/api/games/${gameId}/publish-consent`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ consent: true })
                    })
                    if (res.ok) setMyPublishConsent(true)
                    setPublishLoading(false)
                  }}
                  className="btn-ghost p-[0.3rem_0.6rem] text-[0.65rem] mt-1 self-start"
                >
                  {t('game.proposePublish') as string}
                </button>
              )
            )}
          </div>
        )}

        <button onClick={saveSettings} className="btn-primary p-[0.6rem_1.2rem] text-[0.95rem] w-full">
          {t('game.saveSettings') as string}
        </button>
      </div>
    </Modal>
  )
}
