'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import RichEditor from './RichEditor'
import TagAutocomplete, { type TagItem } from './TagAutocomplete'
import { useT } from './SettingsContext'
import FilterSelect from './FilterSelect'
import { safeJson } from '@/lib/fetch-utils'

interface Props {
  initial?: {
    id: string; title: string; body: string | null; type: string; content_level: string
    fandom_type: string; pairing: string; language: string; tags: string[]; is_public: boolean; status: string
  }
}

export default function RequestForm({ initial }: Props) {
  const router = useRouter()
  const t = useT()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [type, setType] = useState(initial?.type ?? '')
  const [contentLevel, setContentLevel] = useState(initial?.content_level ?? '')
  const [fandomType, setFandomType] = useState(initial?.fandom_type ?? '')
  const [pairing, setPairing] = useState(initial?.pairing ?? '')
  const [language, setLanguage] = useState(initial?.language ?? '')
  const [tags, setTags] = useState<TagItem[]>(
    (initial?.tags ?? []).map(t => ({ slug: t, name: t }))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [dbSaved, setDbSaved] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const draftMsgTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const dbMsgTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const hasUnsavedRef = useRef(false)
  const submittedRef = useRef(false)
  const DRAFT_KEY = 'apocrif_request_draft'

  // beforeunload warning for unsaved changes (ref-based, registered once)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current && !submittedRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Restore draft from localStorage (only for new requests).
  // localStorage недоступен на SSR, поэтому нельзя использовать lazy initial
  // state — это вызвало бы hydration mismatch. Осознанное setState в mount-эффекте.
  useEffect(() => {
    if (initial) return
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (!saved) return
      const d = JSON.parse(saved)
      /* eslint-disable react-hooks/set-state-in-effect -- mount-only draft restore from localStorage (SSR-safe) */
      if (d.title) setTitle(d.title)
      if (d.body) setBody(d.body)
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch { /* corrupted draft */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- restore once on mount

  // Autosave draft with debounce
  const saveDraft = useCallback(() => {
    if (initial) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          title, body, type, contentLevel, fandomType, pairing, language, tags,
        }))
        setDraftSaved(true)
        if (draftMsgTimerRef.current) clearTimeout(draftMsgTimerRef.current)
        draftMsgTimerRef.current = setTimeout(() => setDraftSaved(false), 2000)
      } catch { /* storage full */ }
    }, 1000)
  }, [initial, title, body, type, contentLevel, fandomType, pairing, language, tags])

  useEffect(() => {
    saveDraft()
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (draftMsgTimerRef.current) clearTimeout(draftMsgTimerRef.current)
      if (dbMsgTimerRef.current) clearTimeout(dbMsgTimerRef.current)
    }
  }, [saveDraft])

  // Update unsaved ref when form content changes
  useEffect(() => {
    if (initial) {
      const tagSlugs = tags.map(t => t.slug).sort().join(',')
      const initialTagSlugs = (initial.tags ?? []).sort().join(',')
      hasUnsavedRef.current = title !== initial.title || body !== (initial.body ?? '') ||
        type !== initial.type || contentLevel !== initial.content_level ||
        fandomType !== initial.fandom_type || pairing !== initial.pairing ||
        language !== initial.language || tagSlugs !== initialTagSlugs
    } else {
      hasUnsavedRef.current = title.trim() !== '' || body.trim() !== ''
    }
  }, [initial, title, body, type, contentLevel, fandomType, pairing, language, tags])

  const CONTENT_LEVELS = [
    { value: 'none', label: t('filters.noNsfw') as string },
    { value: 'rare', label: t('filters.nsfwRare') as string },
    { value: 'often', label: t('filters.nsfwOften') as string },
    { value: 'core', label: t('filters.nsfwCore') as string },
    { value: 'flexible', label: t('filters.nsfwFlexible') as string },
  ]

  const PAIRING_OPTIONS = [
    { value: 'sl', label: 'M/M' },
    { value: 'fm', label: 'F/F' },
    { value: 'gt', label: 'M/F' },
    { value: 'multi', label: t('filters.multiPairing') as string },
    { value: 'other', label: t('filters.other') as string },
    { value: 'any', label: t('filters.pairingNotImportant') as string },
  ]

  const LANGUAGE_OPTIONS = [
    { value: 'ru', label: t('filters.langRu') as string },
    { value: 'en', label: t('filters.langEn') as string },
  ]

  async function submit(statusArg: string) {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = t('form.errorNoTitle') as string
    if (!type || !fandomType || !pairing || !contentLevel || !language) errs.selects = t('form.errorAllSelects') as string
    if (statusArg === 'active' && tags.length < 3) errs.tags = t('form.errorMinTags') as string
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({}); setLoading(true)
    const payload = {
      title, description: body, type, content_level: contentLevel,
      fandom_type: fandomType, pairing, language,
      tags: tags.map(t => t.slug),
      structured_tags: tags.map(t => ({ id: t.id, slug: t.slug })),
      is_public: true, status: statusArg,
    }

    const url  = initial ? `/api/requests/${initial.id}` : '/api/requests'
    const method = initial ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const d = await safeJson(res)
        const errKey = `errors.${d.error}`
        const translated = t(errKey)
        setErrors({ server: (translated !== errKey ? translated : d.error ?? t('errors.generic')) as string })
        setLoading(false)
        return
      }
    } catch {
      setErrors({ server: t('errors.networkError') as string })
      setLoading(false)
      return
    }

    if (!initial) {
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ok */ }
    }

    // Show success message for DB save (only for new requests, not edits)
    if (!initial) {
      setDbSaved(true)
      if (dbMsgTimerRef.current) clearTimeout(dbMsgTimerRef.current)
      dbMsgTimerRef.current = setTimeout(() => setDbSaved(false), 2000)
    }

    submittedRef.current = true
    router.push(`/my/requests?tab=${statusArg === 'draft' ? 'draft' : 'active'}`)
    router.refresh()
  }

  return (
    <form className="flex flex-col gap-5">
      {/* Title */}
      <Field label={t('form.titleLabel') as string} error={errors.title}>
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)} required maxLength={200}
          autoFocus={!initial}
          aria-invalid={errors.title ? true : undefined}
          placeholder={t('form.titlePlaceholder') as string}
          className="input-base text-[1rem] p-[0.65rem_0.9rem] w-full"
        />
      </Field>

      {/* Filter panel */}
      <div>
        <div className="form-filter-panel">
          <FilterSelect value={type} onChange={setType} placeholder={t('form.selectType') as string} className="flex-1" options={[
            { value: 'duo', label: t('filters.duo') as string },
            { value: 'multiplayer', label: t('filters.multiplayer') as string },
          ]} />
          <div className="form-filter-sep" />
          <FilterSelect value={fandomType} onChange={setFandomType} placeholder={t('form.selectBasis') as string} className="flex-1" options={[
            { value: 'fandom', label: t('filters.fandom') as string },
            { value: 'original', label: t('filters.original') as string },
          ]} />
          <div className="form-filter-sep" />
          <FilterSelect value={pairing} onChange={setPairing} placeholder={t('form.selectPairing') as string} className="flex-1" options={PAIRING_OPTIONS} />
          <div className="form-filter-sep" />
          <FilterSelect value={contentLevel} onChange={setContentLevel} placeholder={t('form.selectNsfw') as string} className="flex-1" options={CONTENT_LEVELS} />
          <div className="form-filter-sep" />
          <FilterSelect value={language} onChange={setLanguage} placeholder={t('form.selectLang') as string} className="flex-1" options={LANGUAGE_OPTIONS} />
        </div>
        {errors.selects && <p className="text-error font-mono text-[0.65rem] mt-1" role="alert">{errors.selects}</p>}
      </div>

      {/* Tags */}
      <Field label={`${t('form.tagsLabel') as string} (${tags.length}/20)`} error={errors.tags}>
        <TagAutocomplete
          selectedTags={tags}
          onTagsChange={setTags}
          maxTags={20}
          allowCreate={true}
          placeholder={t('form.tagPlaceholder') as string}
        />
      </Field>

      {/* Body */}
      <Field label={t('form.description') as string}>
        <RichEditor content={body} onChange={setBody} placeholder={t('form.descriptionPlaceholder') as string} />
      </Field>

      {errors.server && <p className="text-error font-mono text-[0.72rem]" role="alert" aria-live="polite">{errors.server}</p>}
      {dbSaved && !initial && (
        <p className="text-ink-3 font-mono text-[0.65rem] tracking-[0.08em]">&#10003; {t('form.draftSaved') as string}</p>
      )}

      <div className="flex gap-4 flex-wrap items-center">
        <button type="button" onClick={() => submit('active')} disabled={loading}
          className="btn-primary text-[1rem] py-2.5 px-7">
          {loading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('form.publish') as string}
        </button>
        <button type="button" onClick={() => submit('draft')} disabled={loading}
          className="btn-ghost font-heading italic text-[1rem] py-2.5 px-7">
          {loading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t('form.saveDraft') as string}
        </button>
      </div>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-mono text-[0.62rem] tracking-[0.15em] uppercase text-ink-2">{label}</label>
      {children}
      {error && (
        <p className="text-[#c0392b] font-mono text-[0.72rem]" role="alert" aria-live="polite">{error}</p>
      )}
    </div>
  )
}
