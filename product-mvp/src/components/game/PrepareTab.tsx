'use client'
import { useState } from 'react'
import { useT } from '../SettingsContext'
import { paginationRange } from '@/lib/game-utils'
import RichEditor from '../RichEditor'
import MsgContent from './MsgContent'
import type { Message } from './types'

interface PrepareTabProps {
  messages: Message[]
  userId: string
  gameId: string
  currentPage: number
  totalPages: number
  pageLoading: boolean
  fullscreen: boolean
  submitLoading: boolean
  onGoToPage: (page: number) => void
  onUpdateMessage: (data: { id: string; content: string; edited_at: string }) => void
  onMyConsentReset: () => void
  onSubmitToModeration: () => void
}

export default function PrepareTab({
  messages,
  userId,
  gameId,
  currentPage,
  totalPages,
  pageLoading,
  fullscreen,
  submitLoading,
  onGoToPage,
  onUpdateMessage,
  onMyConsentReset,
  onSubmitToModeration,
}: PrepareTabProps) {
  const t = useT()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [editSaving, setEditSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function saveEdit(msgId: string) {
    setEditSaving(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/games/${gameId}/messages/${msgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      if (res.ok) {
        const d = await res.json()
        onUpdateMessage(d)
        onMyConsentReset()
        setEditingId(null)
        setEditContent('')
      } else {
        const d = await res.json().catch(() => ({}))
        setErrorMsg(t(`errors.${d.error}`) as string || t('errors.networkError') as string)
      }
    } catch {
      setErrorMsg(t('errors.networkError') as string)
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <>
      <div
        className="flex-1 overflow-y-auto bg-surface"
        style={{ padding: fullscreen ? '1.5rem 6rem' : '1.5rem' }}
      >
        {pageLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="font-mono text-[0.75rem] text-ink-2">{t('game.loading') as string}</span>
          </div>
        )}

        {messages.map(msg => {
          const isMine = msg.user_id === userId
          const canEdit = isMine && msg.type !== 'dice'

          return (
            <div
              key={msg.id}
              className="border-b border-edge py-4"
              style={!isMine ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
            >
              {/* Header */}
              <div className="flex items-baseline justify-between mb-2">
                <span className="flex items-baseline gap-2">
                  <span className="font-heading italic text-[1rem] text-ink-2">{msg.nickname}</span>
                  <span className="font-mono text-[0.6rem] opacity-40">
                    {new Date(msg.created_at).toLocaleString('ru', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {msg.edited_at && (
                    <span className="font-mono text-[0.55rem] opacity-40">
                      ({t('game.editedShort') as string})
                    </span>
                  )}
                </span>

                {/* Edit button */}
                {canEdit && editingId !== msg.id && (
                  <button
                    onClick={() => {
                      setEditingId(msg.id)
                      setEditContent(msg.content)
                      setErrorMsg(null)
                    }}
                    className="bg-transparent border-none cursor-pointer p-0 leading-none"
                    style={{ color: 'var(--text-2)' }}
                    title={t('game.editNote') as string}
                  >
                    <svg width={11} height={11} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Content */}
              {editingId === msg.id ? (
                <div>
                  <RichEditor content={editContent} onChange={setEditContent} />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveEdit(msg.id)}
                      disabled={editSaving}
                      className="btn-primary font-mono text-[0.7rem] p-[0.3rem_0.9rem]"
                    >
                      {editSaving ? '...' : t('game.save') as string}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditContent(''); setErrorMsg(null) }}
                      className="btn-ghost font-mono text-[0.65rem] p-[0.25rem_0.7rem]"
                    >
                      {t('game.cancel') as string}
                    </button>
                  </div>
                  {errorMsg && (
                    <p className="font-mono text-[0.65rem] mt-1" style={{ color: '#c0392b' }}>{errorMsg}</p>
                  )}
                </div>
              ) : (
                <MsgContent className="tiptap-content" html={msg.content} />
              )}
            </div>
          )
        })}
      </div>

      {/* Submit to moderation button */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-edge bg-surface-2 shrink-0">
        <button
          onClick={onSubmitToModeration}
          disabled={submitLoading}
          className="btn-primary font-mono text-[0.7rem] p-[0.4rem_1.2rem]"
        >
          {submitLoading ? '...' : t('game.submitToModeration') as string}
        </button>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-2 px-4 border-t border-edge bg-surface-2 shrink-0">
          <button onClick={() => onGoToPage(1)} disabled={currentPage === 1 || pageLoading} className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30">&laquo;</button>
          <button onClick={() => onGoToPage(currentPage - 1)} disabled={currentPage === 1 || pageLoading} className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30">&lsaquo;</button>
          {paginationRange(currentPage, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`dot-${i}`} className="font-mono text-[0.6rem] text-ink-2 px-1">&hellip;</span>
            ) : (
              <button
                key={p}
                onClick={() => onGoToPage(p as number)}
                disabled={pageLoading}
                className="font-mono text-[0.65rem] border p-[0.2rem_0.45rem] cursor-pointer min-w-[1.6rem] text-center"
                style={{
                  background: p === currentPage ? 'var(--accent-dim)' : 'transparent',
                  borderColor: p === currentPage ? 'var(--accent)' : 'var(--border)',
                  color: p === currentPage ? 'var(--accent)' : 'var(--text-2)',
                  fontWeight: p === currentPage ? 600 : 400,
                }}
              >
                {p}
              </button>
            )
          )}
          <button onClick={() => onGoToPage(currentPage + 1)} disabled={currentPage === totalPages || pageLoading} className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30">&rsaquo;</button>
          <button onClick={() => onGoToPage(totalPages)} disabled={currentPage === totalPages || pageLoading} className="font-mono text-[0.65rem] bg-transparent border border-edge text-ink-2 p-[0.2rem_0.45rem] cursor-pointer disabled:opacity-30">&raquo;</button>
        </div>
      )}
    </>
  )
}
