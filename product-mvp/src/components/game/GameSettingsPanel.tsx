'use client'
import { useEffect, useState } from 'react'
import { useSettings, useT } from '../SettingsContext'
import { useToast } from '../ToastProvider'
import type { Participant } from './types'
import { X, ChevronRight } from 'lucide-react'
import { MIN_IC_POSTS } from '@/lib/constants'

interface GameSettingsPanelProps {
  open: boolean
  gameId: string
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
  onReport: () => void
  onLeave: () => void
  onClose: () => void
  // Publish
  gameStatus: string
  icPostCount: number
  myPublishConsent: boolean
  publishLoading: boolean
  onProposePublish: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="game-sp-section">
      <p className="game-sp-section-title">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, children, onClick }: { label: string; children?: React.ReactNode; onClick?: () => void }) {
  return (
    <div className="game-sp-row" onClick={onClick}>
      <span className="game-sp-row-label">{label}</span>
      {children}
    </div>
  )
}

export default function GameSettingsPanel({
  open, gameId,
  nickname, setNickname, avatarUrl, setAvatarUrl,
  bannerUrl, setBannerUrl, bannerPref, setBannerPref,
  oocEnabled, setOocEnabled,
  onSettingsSaved, onReport, onLeave, onClose,
  gameStatus, icPostCount, myPublishConsent, publishLoading, onProposePublish,
}: GameSettingsPanelProps) {
  const { notesEnabled, gameLayout, set } = useSettings()
  const t = useT()
  const { addToast } = useToast()
  const [expandedField, setExpandedField] = useState<string | null>(null)

  const toggle = (field: string) => setExpandedField(prev => prev === field ? null : field)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

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

  const bannerPrefLabels: Record<string, string> = {
    own: t('game.bannerOwn') as string,
    partner: t('game.bannerPartner') as string,
    none: t('game.bannerNone') as string,
  }
  const layoutLabels: Record<string, string> = {
    dialog: t('game.layoutDialog') as string,
    feed: t('game.layoutFeed') as string,
    book: t('game.layoutBook') as string,
  }

  return (
    <>
      <div className={`game-settings-overlay ${open ? 'open' : ''}`} onClick={onClose} />

      <div className={`game-settings-panel ${open ? 'open' : ''}`}>
        {/* Header */}
        <div className="flex justify-between items-baseline px-5 pt-3 pb-2">
          <h2 className="font-heading italic font-light text-[1.1rem] text-ink">
            {t('game.settingsTitle') as string}
          </h2>
          <button onClick={onClose} className="bg-transparent border-none text-ink-2 cursor-pointer leading-none p-[0.2rem] flex items-center">
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col overflow-y-auto flex-1">
          {/* ── Character ── */}
          <Section title={t('game.characterSection') as string}>
            <Row label={t('game.nicknameLabel') as string} onClick={() => toggle('nickname')}>
              <span className="game-sp-row-value">{nickname || '—'} <ChevronRight size={10} className="inline" aria-hidden="true" /></span>
            </Row>
            {expandedField === 'nickname' && (
              <input value={nickname} onChange={e => setNickname(e.target.value)} className="game-sp-input mt-1" maxLength={50} autoFocus />
            )}

            <Row label={t('game.avatarLabel') as string} onClick={() => toggle('avatar')}>
              <div className="flex items-center gap-1.5">
                {avatarUrl && /^https?:\/\//i.test(avatarUrl.trim()) && (
                  <div className="w-5 h-5 rounded-full border border-edge shrink-0" style={{ backgroundImage: `url(${avatarUrl.trim().replace(/[()'"\\]/g, '')})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                <span className="game-sp-row-value">▸</span>
              </div>
            </Row>
            {expandedField === 'avatar' && (
              <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="game-sp-input mt-1" placeholder="https://..." maxLength={512} autoFocus />
            )}
          </Section>

          {/* ── Appearance ── */}
          <Section title={t('game.decorSection') as string}>
            <Row label={t('game.layoutLabel') as string} onClick={() => toggle('layout')}>
              <span className="game-sp-row-value">{layoutLabels[gameLayout]} <ChevronRight size={10} className="inline" aria-hidden="true" /></span>
            </Row>
            {expandedField === 'layout' && (
              <div className="flex gap-1 mt-1">
                {(['dialog', 'feed', 'book'] as const).map(val => (
                  <button
                    key={val}
                    onClick={() => set('gameLayout', val)}
                    className={`game-sp-layout-btn ${gameLayout === val ? 'game-sp-layout-btn-active' : ''}`}
                  >
                    {layoutLabels[val]}
                  </button>
                ))}
              </div>
            )}

            <Row label={t('game.bannerLabel') as string} onClick={() => toggle('banner')}>
              <span className="game-sp-row-value">{bannerPrefLabels[bannerPref]} <ChevronRight size={10} className="inline" aria-hidden="true" /></span>
            </Row>
            {expandedField === 'banner' && (
              <div className="mt-1 flex flex-col gap-1.5">
                <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} className="game-sp-input" placeholder="https://..." maxLength={512} />
                {bannerUrl && /^https?:\/\//i.test(bannerUrl.trim()) && (
                  <div className="w-full h-8 border border-edge" style={{ backgroundImage: `url(${bannerUrl.trim().replace(/[()'"\\]/g, '')})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                <div className="flex gap-2">
                  {(['own', 'partner', 'none'] as const).map(val => (
                    <label key={val} className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="banner_pref" checked={bannerPref === val} onChange={() => setBannerPref(val)} className="w-[11px] h-[11px] shrink-0 accent-muted" />
                      <span className="font-mono text-[0.55rem] text-ink">{bannerPrefLabels[val]}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* ── Tabs ── */}
          <Section title={t('game.tabsSection') as string}>
            <Row label={t('game.oocTab') as string}>
              <label className="flex items-center gap-1 cursor-pointer">
                <span className="font-mono text-[0.5rem] text-ink-3">{oocEnabled ? 'Вкл' : 'Выкл'}</span>
                <input type="checkbox" checked={oocEnabled} onChange={e => setOocEnabled(e.target.checked)} className="w-[12px] h-[12px] shrink-0 accent-muted" />
              </label>
            </Row>
            <Row label={t('game.notesTab') as string}>
              <label className="flex items-center gap-1 cursor-pointer">
                <span className="font-mono text-[0.5rem] text-ink-3">{notesEnabled ? 'Вкл' : 'Выкл'}</span>
                <input type="checkbox" checked={notesEnabled} onChange={e => set('notesEnabled', e.target.checked)} className="w-[12px] h-[12px] shrink-0 accent-muted" />
              </label>
            </Row>
          </Section>

          {/* ── Publish ── */}
          {gameStatus === 'active' && (
            <Section title={t('game.publishSection') as string}>
              <Row label={`${t('game.proposePublishLabel') as string} (${icPostCount}/${MIN_IC_POSTS})`}>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={myPublishConsent}
                    disabled={icPostCount < MIN_IC_POSTS || myPublishConsent || publishLoading}
                    onChange={() => onProposePublish()}
                    className="w-[12px] h-[12px] shrink-0 accent-muted"
                  />
                </label>
              </Row>
              {myPublishConsent && (
                <p className="font-mono text-[0.5rem] text-ink-3 tracking-[0.04em] px-4 pb-2">
                  {t('game.publishProposed') as string}
                </p>
              )}
            </Section>
          )}

          {/* ── Management ── */}
          <Section title={t('game.managementSection') as string}>
            <div className="flex flex-col">
              <button onClick={() => { onReport(); onClose() }} className="game-sp-action-btn">
                {t('game.report') as string}
              </button>
              <button onClick={() => { onLeave(); onClose() }} className="game-sp-action-btn game-sp-action-danger">
                {t('game.leaveGame') as string}
              </button>
            </div>
          </Section>

          {/* Save */}
          <div className="px-5 py-3">
            <button onClick={saveSettings} className="game-send-btn w-full justify-center">
              {t('game.saveSettings') as string}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
