import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import { query } from '@/lib/db'
import Link from 'next/link'

interface GameRow {
  id: string; request_title: string | null; created_at: string
  left_at: string | null; my_nickname: string; message_count: string; active_participants: string
}

export default async function MyGamesPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const games = await query<GameRow>(
    `SELECT g.*, gp.left_at, gp.nickname as my_nickname,
            r.title as request_title,
            (SELECT COUNT(*) FROM messages m WHERE m.game_id = g.id)::text as message_count,
            (SELECT COUNT(*) FROM game_participants gp2 WHERE gp2.game_id = g.id AND gp2.left_at IS NULL)::text as active_participants
     FROM games g
     JOIN game_participants gp ON gp.game_id = g.id AND gp.user_id = $1
     LEFT JOIN requests r ON r.id = g.request_id
     ORDER BY g.created_at DESC`,
    [user.id]
  )

  const active = games.filter(g => !g.left_at)
  const finished = games.filter(g => g.left_at)

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.75rem' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '0.5rem' }}>§ Мои игры</p>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text)', marginBottom: '2.5rem' }}>Мои игры</h1>

      <Section title="Активные игры" games={active} />
      <Section title="Завершённые игры" games={finished} dimmed />
    </div>
  )
}

function Section({ title, games, dimmed }: { title: string; games: GameRow[]; dimmed?: boolean }) {
  return (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', fontStyle: 'italic', color: dimmed ? 'var(--text-2)' : 'var(--text)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        {title} <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.1em' }}>({games.length})</span>
      </h2>

      {games.length === 0 && (
        <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Пусто.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)' }}>
        {games.map(g => (
          <Link key={g.id} href={`/games/${g.id}`}
            style={{ background: 'var(--bg)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', textDecoration: 'none', opacity: dimmed ? 0.7 : 1 }}
          >
            <div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', color: 'var(--text)', marginBottom: '0.2rem' }}>
                {g.request_title ?? 'Без названия'}
              </p>
              <p style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.08em', color: 'var(--text-2)' }}>
                Никнейм: {g.my_nickname} &nbsp;·&nbsp; {g.message_count} постов &nbsp;·&nbsp; {g.active_participants} активных
              </p>
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.1em' }}>Открыть →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
