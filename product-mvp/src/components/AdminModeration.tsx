'use client'
import { useState } from 'react'
import Link from 'next/link'

interface GameRow {
  id: string
  request_title: string | null
  created_at: string
  ic_count: string
  participants: { nickname: string }[]
}

interface CommentRow {
  id: string
  content: string
  created_at: string
  game_id: string
  request_title: string | null
  is_author_reply: boolean
  parent_content: string | null
}

export default function AdminModerationClient({
  games: initialGames,
  comments: initialComments,
}: {
  games: GameRow[]
  comments: CommentRow[]
}) {
  const [games, setGames] = useState(initialGames)
  const [comments, setComments] = useState(initialComments)
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})

  async function moderateGame(gameId: string, action: 'approve' | 'reject') {
    setLoading(gameId)
    const reason = action === 'reject' ? rejectReason[gameId] || '' : undefined
    try {
      const res = await fetch(`/api/admin/games/${gameId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      if (res.ok) {
        setGames(prev => prev.filter(g => g.id !== gameId))
      } else {
        alert('Ошибка')
      }
    } finally {
      setLoading(null)
    }
  }

  async function approveComment(commentId: string) {
    setLoading(commentId)
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, { method: 'POST' })
      if (res.ok) setComments(prev => prev.filter(c => c.id !== commentId))
      else alert('Ошибка')
    } finally {
      setLoading(null)
    }
  }

  async function deleteComment(commentId: string) {
    setLoading(commentId)
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' })
      if (res.ok) setComments(prev => prev.filter(c => c.id !== commentId))
      else alert('Ошибка')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-[900px] mx-auto py-12 px-6">
      <h1 className="page-title mb-8">Модерация</h1>

      {/* Games queue */}
      <section className="mb-12">
        <h2 className="font-mono text-[0.7rem] tracking-[0.15em] uppercase text-ink-2 mb-4 border-b border-edge pb-2">
          Игры на публикацию ({games.length})
        </h2>
        {games.length === 0 ? (
          <p className="text-ink-2 font-heading italic">Очередь пуста</p>
        ) : (
          <div className="flex flex-col gap-4">
            {games.map(g => (
              <div key={g.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <Link href={`/games/${g.id}`} target="_blank" className="font-heading text-[1.1rem] text-ink link-accent no-underline">
                      {g.request_title ?? 'Без названия'}
                    </Link>
                    <p className="meta-text mt-1">
                      {g.participants.map(p => p.nickname).join(', ')}
                      &nbsp;·&nbsp;{g.ic_count} постов
                      &nbsp;·&nbsp;{new Date(g.created_at).toLocaleDateString('ru')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 items-start flex-wrap">
                    <button
                      onClick={() => moderateGame(g.id, 'approve')}
                      disabled={loading === g.id}
                      className="btn-primary font-mono text-[0.65rem] p-[0.35rem_1rem]"
                    >
                      {loading === g.id ? '...' : 'Одобрить'}
                    </button>
                    <button
                      onClick={() => moderateGame(g.id, 'reject')}
                      disabled={loading === g.id}
                      className="btn-ghost font-mono text-[0.65rem] p-[0.35rem_1rem]"
                      style={{ color: '#c0392b', borderColor: '#c0392b' }}
                    >
                      {loading === g.id ? '...' : 'Отклонить'}
                    </button>
                  </div>
                </div>
                <input
                  value={rejectReason[g.id] ?? ''}
                  onChange={e => setRejectReason(prev => ({ ...prev, [g.id]: e.target.value }))}
                  placeholder="Причина отклонения (необязательно)"
                  className="bg-surface-2 border border-edge text-ink font-mono text-[0.7rem] p-[0.3rem_0.6rem] w-full outline-none"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comments queue */}
      <section>
        <h2 className="font-mono text-[0.7rem] tracking-[0.15em] uppercase text-ink-2 mb-4 border-b border-edge pb-2">
          Комментарии на проверке ({comments.length})
        </h2>
        {comments.length === 0 ? (
          <p className="text-ink-2 font-heading italic">Комментариев нет</p>
        ) : (
          <div className="flex flex-col gap-3">
            {comments.map(c => (
              <div key={c.id} className="card p-4">
                {c.is_author_reply && c.parent_content && (
                  <p className="font-mono text-[0.6rem] text-ink-2 border-l border-edge pl-2 mb-2 line-clamp-2">
                    ↳ {c.parent_content}
                  </p>
                )}
                <p className="font-body text-[0.9rem] text-ink mb-2">{c.content}</p>
                <div className="flex items-center justify-between gap-4">
                  <p className="meta-text">
                    {c.is_author_reply ? 'Ответ автора' : 'Читатель'}
                    &nbsp;·&nbsp;
                    <Link href={`/library/${c.game_id}`} target="_blank" className="link-accent no-underline">
                      {c.request_title ?? 'Игра'}
                    </Link>
                    &nbsp;·&nbsp;
                    {new Date(c.created_at).toLocaleDateString('ru')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveComment(c.id)}
                      disabled={loading === c.id}
                      className="btn-primary font-mono text-[0.6rem] p-[0.25rem_0.7rem]"
                    >
                      {loading === c.id ? '...' : 'Одобрить'}
                    </button>
                    <button
                      onClick={() => deleteComment(c.id)}
                      disabled={loading === c.id}
                      className="btn-ghost font-mono text-[0.6rem] p-[0.25rem_0.7rem]"
                      style={{ color: '#c0392b', borderColor: '#c0392b' }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
