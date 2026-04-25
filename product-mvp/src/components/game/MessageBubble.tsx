'use client'
import { memo } from 'react'
import { useSettings, useT } from '../SettingsContext'
import { isSMSOnly, feedPostBg } from '@/lib/game-utils'
import MsgContent from './MsgContent'
import type { Message } from './types'
import { Pencil } from 'lucide-react'

interface MessageBubbleProps {
  msg: Message
  /**
   * Current viewer's participant id (per-game opaque). Used instead of user_id
   * to determine `isMine` — see CRIT-1 in audit-v4 (anonymity invariant).
   */
  participantId: string
  isOoc: boolean
  isLeft: boolean
  editingId: string | null
  notesEnabled: boolean
  onStartEdit: (msg: Message) => void
  onCancelEdit: () => void
  onQuotePost: (msg: Message) => void
}

function MessageBubble({
  msg, participantId, isOoc, isLeft, editingId,
  notesEnabled, onStartEdit, onCancelEdit, onQuotePost,
}: MessageBubbleProps) {
  const t = useT()
  const { gameLayout } = useSettings()
  const isMine = msg.participant_id === participantId
  const isEditing = editingId === msg.id
  const smsOnly = isSMSOnly(msg.content)
  const dateStr = new Date(msg.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  const editButton = (size: number) => (
    <button
      onClick={() => isEditing ? onCancelEdit() : onStartEdit(msg)}
      title={isEditing ? t('game.cancel') as string : t('game.editNote') as string}
      aria-label={isEditing ? t('game.cancel') as string : t('game.editNote') as string}
      className={`bg-transparent border-none cursor-pointer p-0 leading-none align-middle ${isEditing ? 'text-accent' : 'text-ink-2'}${size === 10 ? ' ml-[0.5em]' : ''}`}
    >
      <Pencil size={size} strokeWidth={1.5} aria-hidden="true" />
    </button>
  )

  // OOC message
  if (isOoc) {
    return (
      <div data-msg-id={msg.id} className="game-msg">
        <div className={`game-msg-avatar ${isMine ? 'game-msg-avatar-mine' : ''} !w-[28px] !h-[28px]`}>
          {msg.avatar_url
            ? <img src={msg.avatar_url} alt={msg.nickname} className="w-full h-full object-cover" />
            : <span className="font-mono text-[0.6rem] text-ink-2">{msg.nickname[0]}</span>
          }
        </div>
        <div className="flex-1">
          <div className="game-msg-header">
            <span className={`game-msg-nick ${isMine ? '!text-ink' : ''}`}>{msg.nickname}</span>
            <span className="game-msg-time">
              {dateStr}
              {msg.edited_at && ` (${t('game.editedShort') as string})`}
            </span>
          </div>
          <MsgContent
            className="tiptap-content tiptap-content-ooc"
            html={msg.content}
          />
        </div>
      </div>
    )
  }

  // Book layout (non-SMS)
  if (gameLayout === 'book' && !smsOnly) {
    return (
      <div data-msg-id={msg.id} className="max-w-[1550px] mx-auto w-full px-[var(--game-msg-px)]">
        <div className="game-msg-header pb-[0.3rem] mb-[0.35rem] game-book-header-sep">
          <span className="font-heading text-[1rem] text-ink-2 italic">
            {msg.nickname}
          </span>
          <span className="game-msg-time ml-[0.4em]">
            {dateStr}
          </span>
          {msg.edited_at && <span className="game-msg-time">({t('game.editedShort') as string})</span>}
          <span className="inline-flex gap-[0.3rem] ml-auto shrink-0">
            {notesEnabled && (
              <button onClick={() => onQuotePost(msg)} className="bg-transparent border-none text-ink-2 cursor-pointer font-heading text-[0.85rem] p-0 leading-none">&laquo;&hellip;&raquo;</button>
            )}
            {isMine && !isLeft && editButton(11)}
          </span>
        </div>
        <MsgContent
          className="tiptap-content tiptap-content-book"
          html={msg.content}
        />
      </div>
    )
  }

  // Dialog / Feed (+ book+sms fallback)
  return (
    <div data-msg-id={msg.id} className="game-msg" style={{
      flexDirection: (gameLayout === 'dialog' || gameLayout === 'feed') && isMine ? 'row-reverse' : 'row',
      ...(smsOnly && gameLayout !== 'feed' ? { maxWidth: '860px', marginLeft: 'auto', marginRight: 'auto', width: '100%' } : {}),
      ...(gameLayout === 'feed' ? { padding: '0.5rem var(--game-msg-px)' } : {}),
    }}>
      {/* Avatar */}
      <div className={`game-msg-avatar ${isMine ? 'game-msg-avatar-mine' : ''}`}>
        {msg.avatar_url
          ? <img src={msg.avatar_url} alt={msg.nickname} className="w-full h-full object-cover" />
          : <span className="font-heading text-[0.75rem] text-ink-2">{msg.nickname[0]}</span>
        }
      </div>
      <div className="min-w-0 flex-1" style={{ maxWidth: gameLayout === 'feed' ? '100%' : '72%' }}>
        {smsOnly ? (
          <>
            <div className="game-msg-header" style={{ textAlign: (gameLayout === 'dialog' || gameLayout === 'feed') && isMine ? 'right' : 'left', flexDirection: (gameLayout === 'dialog' || gameLayout === 'feed') && isMine ? 'row-reverse' : 'row' }}>
              <span className={`game-msg-nick ${isMine ? '!text-accent' : ''}`}>{msg.nickname}</span>
              {isMine && !isLeft && editButton(10)}
            </div>
            <p className="sms-meta" style={{ textAlign: (gameLayout === 'dialog' || gameLayout === 'feed') && isMine ? 'right' : 'left', marginBottom: '0.2em', marginTop: 0 }}>
              {dateStr}
              {msg.edited_at && ` (${t('game.editedShort') as string})`}
            </p>
            <MsgContent
              className={`tiptap-content tiptap-content-reset min-w-0${isMine && (gameLayout === 'dialog' || gameLayout === 'feed') ? ' sms-right' : ''}`}
              html={msg.content}
            />
          </>
        ) : (
          <>
            <div className="game-msg-header" style={{ textAlign: (gameLayout === 'dialog' || gameLayout === 'feed') && isMine ? 'right' : 'left', flexDirection: (gameLayout === 'dialog' || gameLayout === 'feed') && isMine ? 'row-reverse' : 'row' }}>
              <span className="game-msg-nick">{msg.nickname}</span>
              <span className="game-msg-time">
                {dateStr}
              </span>
              {msg.edited_at && <span className="game-msg-time">({t('game.editedShort') as string})</span>}
              {notesEnabled && (
                <button onClick={() => onQuotePost(msg)} className="bg-transparent border-none text-ink-2 cursor-pointer font-heading text-[0.85rem] p-0 leading-none">&laquo;&hellip;&raquo;</button>
              )}
              {isMine && !isLeft && editButton(11)}
            </div>
            <MsgContent
              className="tiptap-content"
              style={{
                overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0,
                ...(gameLayout === 'feed' ? {
                  background: 'transparent', borderTop: 'none', borderBottom: 'none',
                  ...(isMine ? {
                    padding: `0 var(--game-body-px) 0 0`,
                    borderRight: `3px solid ${feedPostBg(msg.participant_id).replace('0.10', '0.35')}`,
                    borderLeft: 'none',
                  } : {
                    padding: `0 0 0 var(--game-body-px)`,
                    borderLeft: `3px solid ${feedPostBg(msg.participant_id).replace('0.10', '0.35')}`,
                    borderRight: 'none',
                  }),
                } : {
                  background: isMine ? 'var(--post-mine-bg)' : 'transparent',
                  borderTop: 'none', borderBottom: 'none',
                  borderLeft: isMine ? 'none' : `2px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}`,
                  borderRight: isMine ? `2px solid ${isEditing ? 'var(--accent)' : 'var(--post-mine-stripe)'}` : 'none',
                  padding: `var(--game-body-py) var(--game-body-px)`, borderRadius: 0,
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
