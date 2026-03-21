'use client'
import { memo } from 'react'
import { useSettings, useT } from '../SettingsContext'
import { isSMSOnly, feedPostBg } from '@/lib/game-utils'
import MsgContent from './MsgContent'
import type { Message } from './types'

interface MessageBubbleProps {
  msg: Message
  userId: string
  isOoc: boolean
  isLeft: boolean
  editingId: string | null
  notesEnabled: boolean
  onStartEdit: (msg: Message) => void
  onCancelEdit: () => void
  onQuotePost: (msg: Message) => void
}

function MessageBubble({
  msg, userId, isOoc, isLeft, editingId,
  notesEnabled, onStartEdit, onCancelEdit, onQuotePost,
}: MessageBubbleProps) {
  const t = useT()
  const { gameLayout } = useSettings()
  const isMine = msg.user_id === userId
  const isEditing = editingId === msg.id
  const smsOnly = isSMSOnly(msg.content)
  const dateStr = new Date(msg.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  const editButton = (size: number) => (
    <button
      onClick={() => isEditing ? onCancelEdit() : onStartEdit(msg)}
      title={isEditing ? t('game.cancel') as string : t('game.editNote') as string}
      aria-label={isEditing ? t('game.cancel') as string : t('game.editNote') as string}
      className={`bg-transparent border-none cursor-pointer p-0 leading-none align-middle${size === 10 ? ' ml-[0.5em]' : ''}`}
      style={{ color: isEditing ? 'var(--accent)' : 'var(--text-2)' }}
    >
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z"/></svg>
    </button>
  )

  // OOC message
  if (isOoc) {
    return (
      <div data-msg-id={msg.id} className="flex gap-[0.6rem] items-start">
        <div className="w-7 h-7 rounded-full shrink-0 bg-surface-2 overflow-hidden flex items-center justify-center" style={{ border: `1px solid ${isMine ? 'var(--text-2)' : 'var(--border)'}` }}>
          {msg.avatar_url
            ? <img src={msg.avatar_url} alt={msg.nickname} className="w-full h-full object-cover" />
            : <span className="font-mono text-[0.65rem] text-ink-2">{msg.nickname[0]}</span>
          }
        </div>
        <div className="flex-1">
          <span className={`font-mono text-[0.62rem] mr-2 ${isMine ? 'text-ink' : 'text-ink-2'}`}>
            {msg.nickname}
          </span>
          <span className="font-mono text-[0.55rem] text-edge tracking-[0.04em]">
            {dateStr}
            {msg.edited_at && ` (${t('game.editedShort') as string})`}
          </span>
          <MsgContent
            className="tiptap-content"
            style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '0.2rem', color: 'var(--text)', minHeight: 'unset' }}
            html={msg.content}
          />
        </div>
      </div>
    )
  }

  // Book layout (non-SMS)
  if (gameLayout === 'book' && !smsOnly) {
    return (
      <div data-msg-id={msg.id} className="max-w-[1550px] mx-auto w-full px-8">
        <div className="flex items-baseline justify-between gap-3 pb-[0.35rem] mb-[0.4rem]" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <span className="font-heading text-[1rem] text-ink-2 italic">
            {msg.nickname}
            <span className="ml-[0.6em] not-italic font-mono text-[0.6rem] opacity-40 tracking-[0.04em]">
              {dateStr}
            </span>
            {msg.edited_at && <span className="ml-[0.4em] opacity-50 text-[0.75rem] not-italic font-mono">({t('game.editedShort') as string})</span>}
          </span>
          <span className="inline-flex gap-[0.3rem] shrink-0">
            {notesEnabled && (
              <button onClick={() => onQuotePost(msg)} className="bg-transparent border-none text-ink-2 cursor-pointer font-heading text-[0.85rem] p-0 leading-none">&laquo;&hellip;&raquo;</button>
            )}
            {isMine && !isLeft && editButton(11)}
          </span>
        </div>
        <MsgContent
          className="tiptap-content"
          style={{ overflowWrap: 'break-word', wordBreak: 'break-word', background: 'transparent', border: 'none', padding: '0.1rem 0' }}
          html={msg.content}
        />
      </div>
    )
  }

  // Dialog / Feed (+ book+sms fallback)
  return (
    <div data-msg-id={msg.id} className="flex gap-[0.85rem] items-start" style={{
      flexDirection: gameLayout === 'dialog' ? (isMine ? 'row-reverse' : 'row') : 'row',
      ...(smsOnly && gameLayout !== 'feed' ? { maxWidth: '860px', marginLeft: 'auto', marginRight: 'auto', width: '100%' } : {}),
      ...(gameLayout === 'feed' ? { padding: '0.75rem 1rem' } : {}),
    }}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full shrink-0 bg-surface-3 overflow-hidden flex items-center justify-center" style={{ border: `2px solid ${isMine ? 'var(--accent)' : 'var(--border)'}` }}>
        {msg.avatar_url ? <img src={msg.avatar_url} alt={msg.nickname} className="w-full h-full object-cover" /> : <span className="font-heading text-[0.85rem] text-ink-2">{msg.nickname[0]}</span>}
      </div>
      <div className="min-w-0 flex-1" style={{ maxWidth: gameLayout === 'feed' ? '100%' : '72%' }}>
        {smsOnly ? (
          <>
            <p className="font-mono text-[0.58rem] tracking-[0.08em] mb-[0.2rem] font-semibold" style={{ color: isMine ? 'var(--accent)' : 'var(--text-2)', textAlign: gameLayout === 'dialog' && isMine ? 'right' : 'left' }}>
              {msg.nickname}
              {isMine && !isLeft && editButton(10)}
            </p>
            <p className="sms-meta" style={{ textAlign: gameLayout === 'dialog' && isMine ? 'right' : 'left', marginBottom: '0.25em', marginTop: 0 }}>
              {dateStr}
              {msg.edited_at && ` (${t('game.editedShort') as string})`}
            </p>
            <MsgContent
              className={`tiptap-content${isMine && gameLayout === 'dialog' ? ' sms-right' : ''}`}
              style={{ overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0, background: 'transparent', border: 'none', padding: '0' }}
              html={msg.content}
            />
          </>
        ) : (
          <>
            <p className="font-mono text-[0.62rem] tracking-[0.1em] text-ink-2 mb-[0.3rem]" style={{ textAlign: gameLayout === 'dialog' && isMine ? 'right' : 'left' }}>
              {msg.nickname}
              <span className="ml-[0.5em] opacity-40 tracking-[0.04em]">
                {dateStr}
              </span>
              {msg.edited_at && <span className="ml-[0.4em] opacity-60">({t('game.editedShort') as string})</span>}
              {notesEnabled && (
                <button onClick={() => onQuotePost(msg)} className="ml-[0.5em] bg-transparent border-none text-ink-2 cursor-pointer font-heading text-[0.85rem] p-0 leading-none">&laquo;&hellip;&raquo;</button>
              )}
              {isMine && !isLeft && editButton(11)}
            </p>
            <MsgContent
              className="tiptap-content"
              style={{
                overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0,
                ...(gameLayout === 'feed' ? {
                  background: 'transparent', borderTop: 'none', borderBottom: 'none',
                  padding: '0 0 0 0.75rem',
                  borderLeft: `3px solid ${feedPostBg(msg.user_id).replace('0.10', '0.35')}`,
                  borderRight: 'none',
                } : {
                  background: isMine ? 'var(--post-mine-bg)' : 'transparent',
                  borderTop: 'none', borderBottom: 'none',
                  borderLeft: isMine ? 'none' : `2px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}`,
                  borderRight: isMine ? `2px solid ${isEditing ? 'var(--accent)' : 'var(--post-mine-stripe)'}` : 'none',
                  padding: '0.75rem 1.25rem', borderRadius: 0,
                }),
              }}
              html={msg.content}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default memo(MessageBubble)
