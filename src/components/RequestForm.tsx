'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RichEditor from './RichEditor'

const CONTENT_LEVELS = [
  { value: 'none', label: 'Без постельных сцен' },
  { value: 'rare', label: 'Редко' },
  { value: 'often', label: 'Часто' },
  { value: 'core', label: 'Основа сюжета' },
  { value: 'flexible', label: 'По договорённости' },
]

const PAIRING_OPTIONS = [
  { value: 'sl', label: 'M/M' },
  { value: 'fm', label: 'F/F' },
  { value: 'gt', label: 'M/F' },
  { value: 'multi', label: 'Мульти' },
  { value: 'other', label: 'Другое' },
  { value: 'any', label: 'Не важно' },
]

interface Props {
  initial?: {
    id: string; title: string; body: string | null; type: string; content_level: string
    fandom_type: string; pairing: string; tags: string[]; is_public: boolean; status: string
  }
}

export default function RequestForm({ initial }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [type, setType] = useState(initial?.type ?? 'duo')
  const [contentLevel, setContentLevel] = useState(initial?.content_level ?? 'none')
  const [fandomType, setFandomType] = useState(initial?.fandom_type ?? 'original')
  const [pairing, setPairing] = useState(initial?.pairing ?? 'any')
  const [tagsInput, setTagsInput] = useState(initial?.tags.join(', ') ?? '')
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true)
  const [status, setStatus] = useState(initial?.status ?? 'active')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Укажите название заявки'); return }
    setLoading(true); setError('')

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    const payload = { title, description: body, type, content_level: contentLevel, fandom_type: fandomType, pairing, tags, is_public: isPublic, status }

    const url  = initial ? `/api/requests/${initial.id}` : '/api/requests'
    const method = initial ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Ошибка')
      setLoading(false)
      return
    }

    const data = await res.json()
    router.push(`/requests/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Title */}
      <Field label="Название заявки *">
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)} required
          placeholder="Коротко и ёмко..."
          style={inputStyle}
        />
      </Field>

      {/* Type */}
      <Field label="Тип игры *">
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {(['duo', 'multiplayer'] as const).map(t => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--serif-body)', color: type === t ? 'var(--accent)' : 'var(--text-2)' }}>
              <input type="radio" value={t} checked={type === t} onChange={() => setType(t)} style={{ accentColor: 'var(--accent)' }} />
              {t === 'duo' ? 'На двоих' : 'Мультиплеер'}
            </label>
          ))}
        </div>
      </Field>

      {/* Fandom type */}
      <Field label="Основа *">
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {([['fandom', 'Фандом'], ['original', 'Оридж']] as const).map(([val, lbl]) => (
            <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--serif-body)', color: fandomType === val ? 'var(--accent)' : 'var(--text-2)' }}>
              <input type="radio" value={val} checked={fandomType === val} onChange={() => setFandomType(val)} style={{ accentColor: 'var(--accent)' }} />
              {lbl}
            </label>
          ))}
        </div>
      </Field>

      {/* Pairing */}
      <Field label="Пейринг *">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {PAIRING_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => setPairing(o.value)}
              style={{
                fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '0.35rem 0.85rem', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                background: pairing === o.value ? 'var(--accent)' : 'var(--bg-2)',
                color: pairing === o.value ? '#fff' : 'var(--text-2)',
                borderColor: pairing === o.value ? 'var(--accent)' : 'var(--border)',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Content level */}
      <Field label="NSFW *">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {CONTENT_LEVELS.map(l => (
            <button
              key={l.value}
              type="button"
              onClick={() => setContentLevel(l.value)}
              style={{
                fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '0.35rem 0.85rem', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                background: contentLevel === l.value ? 'var(--accent)' : 'var(--bg-2)',
                color: contentLevel === l.value ? '#fff' : 'var(--text-2)',
                borderColor: contentLevel === l.value ? 'var(--accent)' : 'var(--border)',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Tags */}
      <Field label="Теги (через запятую)">
        <input
          type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)}
          placeholder="фэнтези, оригинал, медленный бёрн..."
          style={inputStyle}
        />
      </Field>

      {/* Body */}
      <Field label="Описание">
        <RichEditor content={body} onChange={setBody} placeholder="Расскажи, что хочешь отыграть..." />
      </Field>

      {/* Visibility & Status */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <Field label="Видимость">
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--serif-body)', color: isPublic ? 'var(--accent)' : 'var(--text-2)' }}>
              <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} style={{ accentColor: 'var(--accent)' }} /> Публичная
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--serif-body)', color: !isPublic ? 'var(--accent)' : 'var(--text-2)' }}>
              <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} style={{ accentColor: 'var(--accent)' }} /> Приватная
            </label>
          </div>
        </Field>

        <Field label="Статус">
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {['draft', 'active'].map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--serif-body)', color: status === s ? 'var(--accent)' : 'var(--text-2)' }}>
                <input type="radio" checked={status === s} onChange={() => setStatus(s)} style={{ accentColor: 'var(--accent)' }} />
                {s === 'draft' ? 'Черновик' : 'Активная'}
              </label>
            ))}
          </div>
        </Field>
      </div>

      {error && <p style={{ color: '#c0392b', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{error}</p>}

      <button type="submit" disabled={loading} style={btnStyle}>
        {loading ? '...' : (initial ? 'Сохранить изменения →' : 'Опубликовать заявку →')}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-2)' }}>{label}</span>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-2)', border: '1px solid var(--border)',
  color: 'var(--text)', fontFamily: 'var(--serif-body)', fontSize: '1rem',
  padding: '0.65rem 0.9rem', outline: 'none', width: '100%',
}

const btnStyle: React.CSSProperties = {
  background: 'var(--accent)', color: '#fff',
  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1rem',
  padding: '0.75rem 1.75rem', border: 'none', cursor: 'pointer',
  alignSelf: 'flex-start',
}
