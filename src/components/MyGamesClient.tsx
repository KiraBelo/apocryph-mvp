'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface GameRow {
  id: string
  request_title: string | null
  created_at: string
  left_at: string | null
  my_nickname: string
  message_count: string
  active_participants: string
  last_message_user_id: string | null
  ic_unread: string
  ooc_unread: string
  starred_at: string | null
  hidden_at: string | null
  last_message_at: string | null
}

interface Props {
  games: GameRow[]
  userId: string
}

export default function MyGamesClient({ games: initialGames, userId }: Props) {
  const router = useRouter()
  const [games, setGames] = useState(initialGames)
  const [mainTab, setMainTab] = useState<'active' | 'finished' | 'starred'>('active')
  const [subTab, setSubTab] = useState<'waiting-them' | 'waiting-me'>('waiting-me')

  const visible = games.filter(g => !g.hidden_at)
  const active = visible.filter(g => !g.left_at)
  const finished = visible.filter(g => g.left_at)
  const starred = visible.filter(g => g.starred_at).sort((a, b) => {
    const aFinished = a.left_at ? 1 : 0
    const bFinished = b.left_at ? 1 : 0
    if (aFinished !== bFinished) return aFinished - bFinished
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
    return bTime - aTime
  })

  const waitingMe = active.filter(g => g.last_message_user_id !== userId)
  const waitingThem = active.filter(g => g.last_message_user_id === userId)

  async function toggleStar(gameId: string) {
    const g = games.find(x => x.id === gameId)
    if (!g) return
    const newVal = !g.starred_at
    setGames(prev => prev.map(x => x.id === gameId ? { ...x, starred_at: newVal ? new Date().toISOString() : null } : x))
    await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: newVal }),
    })
  }

  async function hideGame(gameId: string) {
    setGames(prev => prev.map(x => x.id === gameId ? { ...x, hidden_at: new Date().toISOString() } : x))
    await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: true }),
    })
  }

  const tabStyle = (isActive: boolean) => ({
    fontFamily: 'var(--mono)',
    fontSize: '0.7rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: isActive ? 'var(--text)' : 'var(--text-2)',
    padding: '0.6rem 0',
    background: 'none',
    border: 'none',
    borderBottom: isActive ? '1px solid var(--text)' : '1px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s',
  })

  const subTabStyle = (isActive: boolean) => ({
    fontFamily: 'var(--mono)',
    fontSize: '0.62rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: isActive ? 'var(--accent)' : 'var(--text-2)',
    padding: '0.4rem 0',
    background: 'none',
    border: 'none',
    borderBottom: isActive ? '1px solid var(--accent)' : '1px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s',
  })

  const currentGames =
    mainTab === 'finished'
      ? finished
      : mainTab === 'starred'
      ? starred
      : subTab === 'waiting-me'
      ? waitingMe
      : waitingThem

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '3rem 1.75rem' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '0.5rem' }}>§ Мои игры</p>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text)', marginBottom: '2.5rem' }}>Мои игры</h1>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.25rem', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setMainTab('active')} style={tabStyle(mainTab === 'active')}>
          Активные <span style={{ opacity: 0.6 }}>({active.length})</span>
        </button>
        <button onClick={() => setMainTab('starred')} style={tabStyle(mainTab === 'starred')}>
          Избранные <span style={{ opacity: 0.6 }}>({starred.length})</span>
        </button>
        <button onClick={() => setMainTab('finished')} style={tabStyle(mainTab === 'finished')}>
          Завершённые <span style={{ opacity: 0.6 }}>({finished.length})</span>
        </button>
      </div>

      {mainTab === 'active' && (
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', marginTop: '1.25rem' }}>
          <button onClick={() => setSubTab('waiting-me')} style={subTabStyle(subTab === 'waiting-me')}>
            Ждут мой пост <span style={{ opacity: 0.6 }}>({waitingMe.length})</span>
          </button>
          <button onClick={() => setSubTab('waiting-them')} style={subTabStyle(subTab === 'waiting-them')}>
            Жду пост соигрока <span style={{ opacity: 0.6 }}>({waitingThem.length})</span>
          </button>
        </div>
      )}

      {mainTab !== 'active' && <div style={{ marginBottom: '2rem' }} />}

      {currentGames.length === 0 ? (
        <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Пусто.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--game-gap, 1rem)' }}>
          {currentGames.map(g => (
            <div
              key={g.id}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                opacity: mainTab === 'finished' ? 0.7 : 1,
                borderLeft: parseInt(g.ic_unread) > 0
                  ? '3px solid var(--accent)'
                  : parseInt(g.ooc_unread) > 0
                  ? '3px solid var(--text-2)'
                  : '3px solid transparent',
              }}
            >
              {/* Star */}
              <button
                onClick={() => toggleStar(g.id)}
                title={g.starred_at ? 'Убрать из избранного' : 'В избранное'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem 0 0.75rem 1rem', color: g.starred_at ? 'var(--accent)' : 'var(--border)', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}
              >
                {g.starred_at ? '★' : '☆'}
              </button>

              {/* Game link */}
              <Link
                href={`/games/${g.id}`}
                style={{
                  flex: 1,
                  padding: '1rem 1rem 1rem 0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  textDecoration: 'none',
                }}
              >
                <div>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', color: 'var(--text)', marginBottom: '0.2rem' }}>
                    {g.request_title ?? 'Без названия'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.08em', color: 'var(--text-2)' }}>
                      Никнейм: {g.my_nickname} &nbsp;·&nbsp; {g.message_count} постов &nbsp;·&nbsp; {g.active_participants} активных
                    </p>
                    {parseInt(g.ooc_unread) > 0 && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: '0.06em', color: 'var(--bg)', background: 'var(--text-2)', padding: '0.05rem 0.35rem', borderRadius: '2px' }}>
                        оффтоп
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.1em', flexShrink: 0 }}>Открыть →</span>
              </Link>

              {/* Hide button */}
              {g.left_at && (
                <button
                  onClick={() => hideGame(g.id)}
                  title="Скрыть из списка"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem 1rem 0.75rem 0', color: 'var(--text-2)', fontSize: '0.85rem', lineHeight: 1, flexShrink: 0, opacity: 0.5 }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
