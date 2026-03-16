'use client'
import Link from 'next/link'
import { useSettings, useT } from '../SettingsContext'
import { tabBtnCls } from './utils'
import type { Participant } from './types'

interface TopBarProps {
  requestTitle: string | null
  effectiveBanner: string | null
  activeTab: 'ic' | 'ooc' | 'notes'
  setActiveTab: (tab: 'ic' | 'ooc' | 'notes') => void
  oocEnabled: boolean
  fullscreen: boolean
  isLeft: boolean
  participants: Participant[]
  userId: string
  notesCount: number
  onSearchToggle: () => void
  onExport: () => void
  onSettings: () => void
  onReport: () => void
  onLeave: () => void
  onFullscreenToggle: () => void
}

export default function TopBar({
  requestTitle, effectiveBanner, activeTab, setActiveTab,
  oocEnabled, fullscreen, isLeft, participants, userId, notesCount,
  onSearchToggle, onExport, onSettings, onReport, onLeave, onFullscreenToggle,
}: TopBarProps) {
  const { notesEnabled } = useSettings()
  const t = useT()

  return (
    <div className="px-4 py-[0.35rem] border-b border-edge flex items-center shrink-0 bg-surface-2 gap-[0.4rem]">
      {!fullscreen && (
        <Link href="/my/games" className="font-mono text-[0.58rem] tracking-[0.1em] uppercase text-ink-2 mr-2 whitespace-nowrap">←</Link>
      )}
      {requestTitle && !effectiveBanner && (
        <span className="font-heading italic text-[0.9rem] text-ink-3 whitespace-nowrap overflow-hidden text-ellipsis min-w-0">{requestTitle}</span>
      )}
      {(oocEnabled || notesEnabled) && (
        <>
          {requestTitle && !effectiveBanner && <span className="w-px h-4 bg-ink-3 shrink-0" />}
          <div className="flex items-center gap-0 shrink-0">
            <button onClick={() => setActiveTab('ic')} className={tabBtnCls(activeTab === 'ic', 'ic')}>
              {t('game.history') as string}
            </button>
            {oocEnabled && (
              <button onClick={() => setActiveTab('ooc')} className={tabBtnCls(activeTab === 'ooc', 'ooc')}>
                {t('game.offtop') as string}
              </button>
            )}
            {notesEnabled && (
              <button onClick={() => setActiveTab('notes')} className={tabBtnCls(activeTab === 'notes', 'notes')}>
                {t('game.notes') as string} {notesCount > 0 && <span className="ml-[0.3em] opacity-60">{notesCount}</span>}
              </button>
            )}
          </div>
        </>
      )}

      <div className="ml-auto flex gap-[0.35rem] items-center">
        {!fullscreen && (
          <div className="flex gap-1 mr-[0.15rem]">
            {participants.filter(p => !p.left_at).map(p => (
              <div key={p.id} title={p.nickname} className="w-8 h-8 rounded-full overflow-hidden bg-surface-3 flex items-center justify-center shrink-0" style={{ border: `2px solid ${p.user_id === userId ? 'var(--accent)' : 'var(--border)'}` }}>
                {p.avatar_url
                  ? <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
                  : <span className="font-heading text-[0.8rem] text-ink-2">{p.nickname[0]}</span>
                }
              </div>
            ))}
          </div>
        )}
        <span className="w-px h-4 bg-edge" />
        <button onClick={onSearchToggle} className="bg-transparent border-none p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center" style={{ color: 'var(--text-2)' }} title={t('game.search') as string}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="5.5" cy="5.5" r="4" /><line x1="8.8" y1="8.8" x2="13" y2="13" /></svg>
        </button>
        <button onClick={onExport} className="bg-transparent border-none text-ink-2 p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center" title={t('game.export') as string}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="1" x2="7" y2="9" /><polyline points="4,6 7,9 10,6" /><line x1="2" y1="12" x2="12" y2="12" /></svg>
        </button>
        {!isLeft && (
          <>
            <button onClick={onSettings} className="bg-transparent border-none text-ink-2 p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center" title={t('game.settings') as string}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button onClick={onReport} className="bg-transparent border-none text-ink-2 p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center" title={t('game.report') as string}>
              <svg width="13" height="14" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 1v14M2 1h9l-2.5 3.5L11 8H2"/></svg>
            </button>
            <span className="w-px h-4 bg-edge" />
            <button onClick={onLeave} className="bg-transparent border-none text-ink-2 p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center" title={t('game.leaveGame') as string}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/><path d="M17 8l4 4-4 4"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </>
        )}
        <span className="w-px h-4 bg-edge" />
        <button onClick={onFullscreenToggle} title={fullscreen ? t('game.exitFullscreen') as string : t('game.fullscreen') as string} className="bg-transparent border-none text-ink-2 p-[0.3rem_0.4rem] cursor-pointer leading-none flex items-center justify-center">
          {fullscreen ? (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,6 6,6 6,2"/><polyline points="8,2 8,6 12,6"/><polyline points="12,8 8,8 8,12"/><polyline points="6,12 6,8 2,8"/></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,5 1,1 5,1"/><polyline points="9,1 13,1 13,5"/><polyline points="13,9 13,13 9,13"/><polyline points="5,13 1,13 1,9"/></svg>
          )}
        </button>
      </div>
    </div>
  )
}
