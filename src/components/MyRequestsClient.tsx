'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export interface MyRequest {
  id: string; title: string; type: string; content_level: string; tags: string[]
  status: string; is_public: boolean; created_at: string
}

const statusLabel: Record<string, string> = { draft: 'Черновик', active: 'Активная', inactive: 'Неактивная' }
const statusColor: Record<string, string> = { draft: 'var(--text-2)', active: 'var(--accent)', inactive: 'var(--border)' }

export default function MyRequestsClient({ requests }: { requests: MyRequest[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'inactive'>('all')

  const filtered: MyRequest[] = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  async function changeStatus(id: string, status: string) {
    await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  return (
    <div>
      {/* Tab filter */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        {(['all', 'active', 'draft', 'inactive'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', borderBottom: filter === f ? '2px solid var(--accent)' : '2px solid transparent', color: filter === f ? 'var(--accent)' : 'var(--text-2)', padding: '0.6rem 1rem', cursor: 'pointer', marginBottom: '-1px' }}>
            {f === 'all' ? 'Все' : statusLabel[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Заявок нет.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)' }}>
        {filtered.map(r => (
          <div key={r.id} style={{ background: 'var(--bg)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <Link href={`/requests/${r.id}`}
                  style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--text)' }}>
                  {r.title}
                </Link>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: statusColor[r.status] }}>
                  {statusLabel[r.status]}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {r.tags.slice(0, 4).map(t => (
                  <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-2)' }}>#{t}</span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href={`/requests/${r.id}/edit`} style={ghostBtn}>Редактировать</Link>
              {r.status === 'active'
                ? <button onClick={() => changeStatus(r.id, 'inactive')} style={ghostBtn}>Снять</button>
                : <button onClick={() => changeStatus(r.id, 'active')} style={ghostBtn}>Активировать</button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const ghostBtn: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)',
  padding: '0.3rem 0.7rem', cursor: 'pointer', textDecoration: 'none', display: 'inline-block',
}
