'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSettings, useT } from '../SettingsContext'
import { tabBtnCls } from './utils'
import type { Participant } from './types'
import type { GameStatus } from '@/types/api'
import StatusChip from './StatusChip'
import { Search, Download, Settings, Maximize, Minimize, MoreHorizontal } from 'lucide-react'

interface TopBarProps {
  requestTitle: string | null
  effectiveBanner: string | null
  activeTab: 'ic' | 'ooc' | 'notes' | 'prepare'
  setActiveTab: (tab: 'ic' | 'ooc' | 'notes' | 'prepare') => void
  oocEnabled: boolean
  fullscreen: boolean
  isLeft: boolean
  gameStatus: GameStatus
  isFrozen: boolean
  isPreparing: boolean
  partnerWantsPublish: boolean
  participants: Participant[]
  userId: string
  notesCount: number
  icPostCount: number
  publishLoading: boolean
  onSearchToggle: () => void
  onExport: () => void
  onSettings: () => void
  onReport: () => void
  onLeave: () => void
  onFullscreenToggle: () => void
  onProposePublish: () => void
  onPublishResponse: (choice: 'publish_as_is' | 'edit_first' | 'decline') => void
  onRevoke: () => void
  onSubmitToModeration: () => void
}

export default function TopBar({
  requestTitle, effectiveBanner, activeTab, setActiveTab,
  oocEnabled, fullscreen, isLeft, gameStatus, isFrozen, isPreparing, partnerWantsPublish,
  participants, userId, notesCount,
  publishLoading,
  onSearchToggle, onExport, onSettings, onFullscreenToggle,
  onProposePublish, onPublishResponse, onRevoke, onSubmitToModeration,
}: TopBarProps) {
  const { notesEnabled } = useSettings()
  const t = useT()
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

  const showPrepareTab = isPreparing && !isLeft

  // Close overflow on click outside
  useEffect(() => {
    if (!overflowOpen) return
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [overflowOpen])

  // Close overflow on Escape
  useEffect(() => {
    if (!overflowOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverflowOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [overflowOpen])

  const overflowItem = (label: string, onClick: () => void) => (
    <button
      onClick={() => { onClick(); setOverflowOpen(false) }}
      className="block w-full text-left px-4 py-2 bg-transparent border-none text-ink font-body text-[0.85rem] cursor-pointer transition-colors duration-150 hover:bg-surface-2"
    >
      {label}
    </button>
  )

  const tabCls = (active: boolean) =>
    `game-tab ${active ? 'game-tab-active' : ''}`

  return (
    <div className="game-topbar">
      {!fullscreen && (
        <Link href="/my/games" className="font-mono text-[0.7rem] text-ink-3 mr-1" aria-label={t('detail.backToFeed') as string}>←</Link>
      )}
      {requestTitle && !effectiveBanner && (
        <span className="game-topbar-title">{requestTitle}</span>
      )}
      {(oocEnabled || notesEnabled || showPrepareTab) && (
        <>
          {requestTitle && !effectiveBanner && <span className="game-topbar-sep" />}
          <div className="flex items-center gap-0 shrink-0">
            <button onClick={() => setActiveTab('ic')} className={tabCls(activeTab === 'ic')}>
              {t('game.history') as string}
            </button>
            {oocEnabled && (
              <button onClick={() => setActiveTab('ooc')} className={tabCls(activeTab === 'ooc')}>
                {t('game.offtop') as string}
              </button>
            )}
            {notesEnabled && (
              <button onClick={() => setActiveTab('notes')} className={tabCls(activeTab === 'notes')}>
                {t('game.notes') as string} {notesCount > 0 && <span className="ml-[0.3em] opacity-60">{notesCount}</span>}
              </button>
            )}
            {showPrepareTab && (
              <button onClick={() => setActiveTab('prepare')} className={tabCls(activeTab === 'prepare')}>
                {t('game.prepareTab') as string}
              </button>
            )}
          </div>
        </>
      )}

      <div className="ml-auto flex gap-[0.35rem] items-center">
        {/* StatusChip */}
        <StatusChip
          gameStatus={gameStatus}
          isFrozen={isFrozen}
          isLeft={isLeft}
          partnerWantsPublish={partnerWantsPublish}
          publishLoading={publishLoading}
          onProposePublish={onProposePublish}
          onPublishResponse={onPublishResponse}
          onRevoke={onRevoke}
          onSubmitToModeration={onSubmitToModeration}
        />

        {/* Desktop: all buttons visible */}
        <div className="hidden md:flex gap-[0.35rem] items-center">
          {!fullscreen && (
            <div className="flex gap-1 mr-[0.15rem]">
              {participants.filter(p => !p.left_at).map(p => (
                <div
                  key={p.id}
                  title={p.nickname}
                  className={`game-avatar ${p.user_id === userId ? 'game-avatar-mine' : ''}`}
                >
                  {p.avatar_url
                    ? <img
                        src={p.avatar_url}
                        alt={p.nickname}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Невалидный URL — скрываем <img>, следующий <span> будет виден.
                          // Обёртка показывает инициал через CSS.
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    : <span className="font-heading text-[0.7rem] text-ink-2">{p.nickname[0]}</span>
                  }
                </div>
              ))}
            </div>
          )}
          <span className="game-topbar-sep" />
          <button onClick={onSearchToggle} className="game-icon-btn" aria-label={t('game.search') as string}>
            <Search size={14} strokeWidth={1.6} aria-hidden="true" />
          </button>
          <button onClick={onExport} className="game-icon-btn" aria-label={t('game.export') as string}>
            <Download size={14} strokeWidth={1.6} aria-hidden="true" />
          </button>
          {!isLeft && (
            <button onClick={onSettings} className="game-icon-btn" aria-label={t('game.settings') as string}>
              <Settings size={14} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
          <span className="game-topbar-sep" />
          <button onClick={onFullscreenToggle} aria-label={fullscreen ? t('game.exitFullscreen') as string : t('game.fullscreen') as string} className="game-icon-btn">
            {fullscreen
              ? <Minimize size={13} strokeWidth={1.6} aria-hidden="true" />
              : <Maximize size={13} strokeWidth={1.6} aria-hidden="true" />
            }
          </button>
        </div>

        {/* Mobile: overflow menu "..." */}
        <div className="flex md:hidden relative" ref={overflowRef}>
          <button
            onClick={() => setOverflowOpen(v => !v)}
            className="game-icon-btn"
            aria-label={t('nav.openMenu') as string}
            aria-expanded={overflowOpen}
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
          {overflowOpen && (
            <div className="absolute top-[calc(100%+0.5rem)] right-0 bg-surface border border-edge min-w-[180px] z-300 shadow-[0_4px_24px_rgba(0,0,0,0.12)] py-1">
              {overflowItem(t('game.search') as string, onSearchToggle)}
              {overflowItem(t('game.export') as string, onExport)}
              {!isLeft && overflowItem(t('game.settings') as string, onSettings)}
              {overflowItem(fullscreen ? t('game.exitFullscreen') as string : t('game.fullscreen') as string, onFullscreenToggle)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
