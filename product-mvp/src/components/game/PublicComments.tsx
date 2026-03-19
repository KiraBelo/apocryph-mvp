'use client'
import { useEffect, useState } from 'react'
import { useT } from '../SettingsContext'

interface Comment {
  id: string
  content: string
  created_at: string
  is_author: boolean
  replies: Comment[]
}

interface PublicCommentsProps {
  gameId: string
  userId: string | null
  authorUserIds: string[]
}

export default function PublicComments({ gameId, userId, authorUserIds }: PublicCommentsProps) {
  const t = useT()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replySubmitted, setReplySubmitted] = useState<string | null>(null)

  const isAuthor = userId !== null && authorUserIds.includes(userId)

  useEffect(() => {
    fetch(`/api/public-games/${gameId}/comments`)
      .then(r => r.ok ? r.json() : { comments: [] })
      .then(d => setComments(d.comments ?? []))
      .finally(() => setLoading(false))
  }, [gameId])

  async function submitComment() {
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public-games/${gameId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      })
      if (res.ok) {
        setCommentText('')
        setSubmitted(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function submitReply(parentId: string) {
    if (!replyText.trim() || replySubmitting) return
    setReplySubmitting(true)
    try {
      const res = await fetch(`/api/public-games/${gameId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText, parent_id: parentId }),
      })
      if (res.ok) {
        setReplyText('')
        setReplyingTo(null)
        setReplySubmitted(parentId)
      }
    } finally {
      setReplySubmitting(false)
    }
  }

  return (
    <div className="mt-12 border-t border-edge pt-8">
      <h2 className="font-mono text-[0.7rem] tracking-[0.15em] uppercase text-ink-2 mb-6">
        {t('game.commentsTitle') as string}
      </h2>

      {loading ? (
        <p className="text-ink-2 font-mono text-[0.75rem]">{t('game.loading') as string}</p>
      ) : comments.length === 0 ? (
        <p className="text-ink-2 font-heading italic text-[0.9rem]">{t('game.noComments') as string}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {comments.map(c => (
            <div key={c.id} className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-surface-3 shrink-0 flex items-center justify-center">
                  <span className="font-mono text-[0.45rem] text-ink-2">{c.is_author ? '★' : '○'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[0.55rem] tracking-[0.06em] text-ink-2 mb-1">
                    {c.is_author ? t('game.gameAuthor') as string : t('game.reader') as string}
                    &nbsp;·&nbsp;
                    {new Date(c.created_at).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <p className="font-body text-[0.9rem] text-ink leading-relaxed">{c.content}</p>
                  {isAuthor && replySubmitted !== c.id && replyingTo !== c.id && (
                    <button
                      onClick={() => setReplyingTo(c.id)}
                      className="mt-1 font-mono text-[0.55rem] tracking-[0.06em] text-ink-2 bg-transparent border-none cursor-pointer p-0"
                    >
                      {t('game.replyButton') as string}
                    </button>
                  )}
                  {isAuthor && replyingTo === c.id && (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder={t('game.commentPlaceholder') as string}
                        className="flex-1 bg-surface-2 border border-edge text-ink font-body text-[0.85rem] p-[0.3rem_0.6rem] outline-none"
                        maxLength={1000}
                      />
                      <button
                        onClick={() => submitReply(c.id)}
                        disabled={replySubmitting}
                        className="btn-primary font-mono text-[0.65rem] p-[0.3rem_0.8rem]"
                      >
                        {replySubmitting ? '...' : t('game.save') as string}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText('') }}
                        className="btn-ghost font-mono text-[0.6rem] p-[0.25rem_0.6rem]"
                      >
                        {t('game.cancel') as string}
                      </button>
                    </div>
                  )}
                  {isAuthor && replySubmitted === c.id && (
                    <p className="mt-1 font-mono text-[0.55rem] text-ink-2">{t('game.commentPending') as string}</p>
                  )}
                </div>
              </div>
              {c.replies.length > 0 && (
                <div className="ml-9 flex flex-col gap-3">
                  {c.replies.map(r => (
                    <div key={r.id} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-accent-dim shrink-0 flex items-center justify-center">
                        <span className="font-mono text-[0.4rem] text-accent">★</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[0.55rem] tracking-[0.06em] text-ink-2 mb-1">
                          {t('game.gameAuthor') as string}
                          &nbsp;·&nbsp;
                          {new Date(r.created_at).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                        <p className="font-body text-[0.9rem] text-ink leading-relaxed">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comment form for logged-in users */}
      {userId && !submitted && (
        <div className="mt-8 flex flex-col gap-2">
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder={t('game.commentPlaceholder') as string}
            rows={3}
            maxLength={1000}
            className="bg-surface-2 border border-edge text-ink font-body text-[0.9rem] p-[0.5rem_0.7rem] outline-none resize-none"
          />
          <button
            onClick={submitComment}
            disabled={submitting || !commentText.trim()}
            className="btn-primary font-mono text-[0.7rem] p-[0.4rem_1rem] self-end"
          >
            {submitting ? '...' : t('game.commentSend') as string}
          </button>
        </div>
      )}
      {userId && submitted && (
        <p className="mt-6 font-mono text-[0.65rem] text-ink-2">{t('game.commentPending') as string}</p>
      )}
    </div>
  )
}
