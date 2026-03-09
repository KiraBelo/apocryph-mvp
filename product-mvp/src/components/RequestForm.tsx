'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RichEditor from './RichEditor'
import TagAutocomplete, { type TagItem } from './TagAutocomplete'

const CONTENT_LEVELS = [
  { value: 'none', label: 'Без постельных сцен' },
  { value: 'rare', label: 'NSFW редко' },
  { value: 'often', label: 'NSFW часто' },
  { value: 'core', label: 'NSFW основа сюжета' },
  { value: 'flexible', label: 'NSFW по договорённости' },
]

const PAIRING_OPTIONS = [
  { value: 'sl', label: 'M/M' },
  { value: 'fm', label: 'F/F' },
  { value: 'gt', label: 'M/F' },
  { value: 'multi', label: 'Мультипейринг' },
  { value: 'other', label: 'Другое' },
  { value: 'any', label: 'Пейринг не важен' },
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
  const [tags, setTags] = useState<TagItem[]>(
    (initial?.tags ?? []).map(t => ({ slug: t, name: t }))
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(statusArg: string) {
    if (!title.trim()) { setError('Укажите название заявки'); return }
    if (statusArg === 'active' && tags.length < 3) { setError('Для публикации нужно минимум 3 тега'); return }
    setLoading(true); setError('')
    const payload = {
      title, description: body, type, content_level: contentLevel,
      fandom_type: fandomType, pairing,
      tags: tags.map(t => t.slug),
      structured_tags: tags.map(t => ({ id: t.id, slug: t.slug })),
      is_public: true, status: statusArg,
    }

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

    router.push(`/my/requests?tab=${statusArg === 'draft' ? 'draft' : 'active'}`)
    router.refresh()
  }

  return (
    <form className="flex flex-col gap-7">
      {/* Title */}
      <Field label="Название заявки *">
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)} required maxLength={200}
          placeholder="Коротко и ёмко..."
          className="input-base text-[1rem] p-[0.65rem_0.9rem] w-full"
        />
      </Field>

      {/* Type */}
      <Field label="Тип игры *">
        <div className="flex gap-3">
          {(['duo', 'multiplayer'] as const).map(t => (
            <label key={t} className={`flex items-center gap-2 cursor-pointer font-body ${type === t ? 'text-accent' : 'text-ink-2'}`}>
              <input type="radio" value={t} checked={type === t} onChange={() => setType(t)} style={{ accentColor: 'var(--accent)' }} />
              {t === 'duo' ? 'На двоих' : 'Мультиплеер'}
            </label>
          ))}
        </div>
      </Field>

      {/* Fandom type */}
      <Field label="Основа *">
        <div className="flex gap-3">
          {([['fandom', 'Фандом'], ['original', 'Оридж']] as const).map(([val, lbl]) => (
            <label key={val} className={`flex items-center gap-2 cursor-pointer font-body ${fandomType === val ? 'text-accent' : 'text-ink-2'}`}>
              <input type="radio" value={val} checked={fandomType === val} onChange={() => setFandomType(val)} style={{ accentColor: 'var(--accent)' }} />
              {lbl}
            </label>
          ))}
        </div>
      </Field>

      {/* Pairing */}
      <Field label="Пейринг *">
        <div className="flex flex-wrap gap-2">
          {PAIRING_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => setPairing(o.value)}
              className={`font-mono text-[0.68rem] tracking-[0.1em] uppercase p-[0.35rem_0.85rem] border cursor-pointer transition-all duration-150
                ${pairing === o.value
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface-2 text-ink-2 border-edge'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Content level */}
      <Field label="NSFW *">
        <div className="flex flex-wrap gap-2">
          {CONTENT_LEVELS.map(l => (
            <button
              key={l.value}
              type="button"
              onClick={() => setContentLevel(l.value)}
              className={`font-mono text-[0.68rem] tracking-[0.1em] uppercase p-[0.35rem_0.85rem] border cursor-pointer transition-all duration-150
                ${contentLevel === l.value
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface-2 text-ink-2 border-edge'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Tags */}
      <Field label={`Теги (${tags.length}/20)`}>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="badge badge-type">{type === 'duo' ? 'На двоих' : 'Мультиплеер'}</span>
          <span className="badge badge-fandom">{fandomType === 'fandom' ? 'Фандом' : 'Оридж'}</span>
          <span className="badge badge-fandom">{PAIRING_OPTIONS.find(o => o.value === pairing)?.label}</span>
          <span className="badge badge-content">{CONTENT_LEVELS.find(l => l.value === contentLevel)?.label}</span>
        </div>
        <TagAutocomplete
          selectedTags={tags}
          onTagsChange={setTags}
          maxTags={20}
          allowCreate={true}
          placeholder="Начните вводить тег..."
        />
      </Field>

      {/* Body */}
      <Field label="Описание">
        <RichEditor content={body} onChange={setBody} placeholder="Расскажи, что хочешь отыграть..." />
      </Field>

      {error && <p className="text-[#c0392b] font-mono text-[0.8rem]">{error}</p>}

      <div className="flex gap-4 flex-wrap items-center">
        <button type="button" onClick={() => submit('active')} disabled={loading}
          className="btn-primary text-[1rem] py-3 px-7">
          {loading ? '...' : 'Опубликовать заявку →'}
        </button>
        <button type="button" onClick={() => submit('draft')} disabled={loading}
          className="btn-ghost font-heading italic text-[1rem] py-3 px-7">
          {loading ? '...' : 'Сохранить в черновики'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="section-label">{label}</span>
      {children}
    </div>
  )
}
