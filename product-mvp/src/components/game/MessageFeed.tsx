'use client'
import React, { useRef, useEffect } from 'react'
import { useSettings, useT } from '../SettingsContext'
import { paginationRange } from '@/lib/game-utils'
import MessageBubble from './MessageBubble'
import type { Message } from './types'

interface MessageFeedProps {
  messages: Message[]
  /** Current viewer's participant id — see CRIT-1 in audit-v4. */
  participantId: string
  isOoc: boolean
  isLeft: boolean
  isFinished: boolean
  isFrozen: boolean
  fullscreen: boolean
  editingId: string | null
  notesEnabled: boolean
  pageLoading: boolean
  currentPage: number
  totalPages: number
  scrollRef: React.RefObject<HTMLDivElement | null>
  onScroll: () => void
  onSpoilerClick: (e: React.MouseEvent) => void
  onStartEdit: (msg: Message) => void
  onCancelEdit: () => void
  onQuotePost: (msg: Message) => void
  onGoToPage: (type: 'ic' | 'ooc', page: number) => void
  isPrePublish: boolean
}

export default function MessageFeed({
  messages, participantId, isOoc, isLeft, isFinished, isFrozen, fullscreen,
  editingId, notesEnabled, pageLoading,
  currentPage, totalPages,
  scrollRef, onScroll, onSpoilerClick,
  onStartEdit, onCancelEdit, onQuotePost, onGoToPage,
  isPrePublish,
}: MessageFeedProps) {
  const t = useT()
  const { gameLayout } = useSettings()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <>
      {/* Messages area */}
      <div
        ref={scrollRef}
        onClick={onSpoilerClick}
        onScroll={onScroll}
        className={`flex-1 overflow-y-auto flex flex-col ${isOoc ? 'bg-surface-3 gap-3' : 'bg-surface'}`}
        style={{ ...(!isOoc ? { gap: 'var(--game-gap, 1.5rem)' } : {}), padding: fullscreen ? '1.5rem 6rem' : (!isOoc && gameLayout === 'dialog') ? '1.5rem 4rem' : '1.5rem' }}
      >
        {pageLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="font-mono text-[0.75rem] text-ink-2">{t('game.loading') as string}</span>
          </div>
        )}
        {isOoc && (
          <p className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-ink-2 text-center p-2 border-b border-edge mb-2">
            {t('game.offtopLabel') as string}
          </p>
        )}
        {messages.length === 0 && (
          <p className="font-heading italic text-ink-2 text-center mt-8">
            {isOoc ? t('game.emptyOoc') as string : t('game.emptyIc') as string}
          </p>
        )}
        <div className={!isOoc && gameLayout === 'feed' ? 'max-w-[1050px] mx-auto w-full flex flex-col' : 'contents'} style={!isOoc && gameLayout === 'feed' ? { gap: 'var(--game-gap, 1.5rem)' } : undefined}>
          {messages.map(msg => {
            const isDimmed = isPrePublish && msg.participant_id !== participantId && !isOoc
            return (
              <div key={msg.id} style={isDimmed ? { opacity: 0.38, transition: 'opacity 0.2s' } : undefined}>
                <MessageBubble
                  msg={msg}
                  participantId={participantId}
                  isOoc={isOoc}
                  isLeft={isLeft}
                  editingId={editingId}
                  notesEnabled={notesEnabled}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                  onQuotePost={onQuotePost}
                />
              </div>
            )
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-2 px-4 border-t border-edge bg-surface-2 shrink-0">
          <button
            onClick={() => onGoToPage(isOoc ? 'ooc' : 'ic', 1)}
            disabled={currentPage === 1 || pageLoading}
            className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30"
          >&laquo;</button>
          <button
            onClick={() => onGoToPage(isOoc ? 'ooc' : 'ic', currentPage - 1)}
            disabled={currentPage === 1 || pageLoading}
            className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30"
          >&lsaquo;</button>
          {paginationRange(currentPage, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`dot-${i}`} className="font-mono text-[0.6rem] text-ink-2 px-1">&hellip;</span>
            ) : (
              <button
                key={p}
                onClick={() => onGoToPage(isOoc ? 'ooc' : 'ic', p as number)}
                disabled={pageLoading}
                className={`page-btn ${p === currentPage ? 'page-btn-active' : ''}`}
              >{p}</button>
            )
          )}
          <button
            onClick={() => onGoToPage(isOoc ? 'ooc' : 'ic', currentPage + 1)}
            disabled={currentPage === totalPages || pageLoading}
            className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30"
          >&rsaquo;</button>
          <button
            onClick={() => onGoToPage(isOoc ? 'ooc' : 'ic', totalPages)}
            disabled={currentPage === totalPages || pageLoading}
            className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30"
          >&raquo;</button>
        </div>
      )}

      {/* Status footers */}
      {isLeft && (
        <div className="px-6 py-4 text-center bg-surface-2 border-t border-edge font-heading italic text-ink-2">
          {t('game.youLeft') as string}
        </div>
      )}
      {!isLeft && isFinished && !isOoc && (
        <div className="px-6 py-4 text-center bg-surface-2 border-t border-edge font-heading italic text-ink-2">
          {t('game.icFrozen') as string}
        </div>
      )}
    </>
  )
}
