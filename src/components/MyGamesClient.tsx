'use client'

import { useState } from 'react'
import Link from 'next/link'

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
}

interface Props {
  games: GameRow[]
  userId: string
}

export default function MyGamesClient({ games, userId }: Props) {
  const [mainTab, setMainTab] = useState<'active' | 'finished'>('active')
  const [subTab, setSubTab] = useState<'waiting-them' | 'waiting-me'>('waiting-me')

  const active = games.filter(g => !g.left_at)
  const finished = games.filter(g => g.left_at)

  // "Ждут мой пост" — соигрок написал последним (или сообщений нет), моя очередь
  const waitingMe = active.filter(g => g.last_message_user_id !== userId)
  // "Жду пост соигрока" — я написал последним, жду их
  const waitingThem = active.filter(g => g.last_message_user_id === userId)

  const tabStyle = (active: boolean) => ({
    fontFamily: 'var(--mono)',
    fontSize: '0.7rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: active ? 'var(--text)' : 'var(--text-2)',
    padding: '0.6rem 0',
    borderBottom: active ? '1px solid var(--text)' : '1px solid transparent',
    background: 'none',
    border: 'none',
    borderBottomStyle: 'solid' as const,
    borderBottomWidth: '1px',
    borderBottomColor: active ? 'var(--text)' : 'transparent',
    cursor: 'pointer',
    transition: 'color 0.15s',
  })

  const subTabStyle = (active: boolean) => ({
    fontFamily: 'var(--mono)',
    fontSize: '0.62rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: active ? 'var(--accent)' : 'var(--text-2)',
    padding: '0.4rem 0',
    borderBottom: active ? '1px solid var(--accent)' : '1px solid transparent',
    background: 'none',
    border: 'none',
    borderBottomStyle: 'solid' as const,
    borderBottomWidth: '1px',
    borderBottomColor: active ? 'var(--accent)' : 'transparent',
    cursor: 'pointer',
    transition: 'color 0.15s',
  })

  const currentGames =
    mainTab === 'finished'
      ? finished
      : subTab === 'waiting-me'
      ? waitingMe
      : waitingThem

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.75rem' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '0.5rem' }}>§ Мои игры</p>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text)', marginBottom: '2.5rem' }}>Мои игры</h1>

      {/* Основные вкладки */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.25rem', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setMainTab('active')} style={tabStyle(mainTab === 'active')}>
          Активные{' '}
          <span style={{ opacity: 0.6 }}>({active.length})</span>
        </button>
        <button onClick={() => setMainTab('finished')} style={tabStyle(mainTab === 'finished')}>
          Завершённые{' '}
          <span style={{ opacity: 0.6 }}>({finished.length})</span>
        </button>
      </div>

      {/* Подвкладки для активных */}
      {mainTab === 'active' && (
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', marginTop: '1.25rem' }}>
          <button onClick={() => setSubTab('waiting-me')} style={subTabStyle(subTab === 'waiting-me')}>
            Ждут мой пост{' '}
            <span style={{ opacity: 0.6 }}>({waitingMe.length})</span>
          </button>
          <button onClick={() => setSubTab('waiting-them')} style={subTabStyle(subTab === 'waiting-them')}>
            Жду пост соигрока{' '}
            <span style={{ opacity: 0.6 }}>({waitingThem.length})</span>
          </button>
        </div>
      )}

      {mainTab === 'finished' && <div style={{ marginBottom: '2rem' }} />}

      {/* Список игр */}
      {currentGames.length === 0 ? (
        <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Пусто.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)' }}>
          {currentGames.map(g => (
            <Link
              key={g.id}
              href={`/games/${g.id}`}
              style={{
                background: 'var(--bg)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                textDecoration: 'none',
                opacity: mainTab === 'finished' ? 0.7 : 1,
                borderLeft: parseInt(g.ic_unread) > 0
                  ? '3px solid var(--accent)'
                  : parseInt(g.ooc_unread) > 0
                  ? '3px solid var(--text-2)'
                  : '3px solid transparent',
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
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.1em' }}>Открыть →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
