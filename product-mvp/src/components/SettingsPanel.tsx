'use client'
import { useEffect, useState } from 'react'
import { useSettings, useT, type Settings } from './SettingsContext'
import type { TagPreset } from './SettingsContext'
import { FONT_GROUPS } from '@/lib/fonts'
import { X, ChevronDown } from 'lucide-react'
import type { Lang } from '@/i18n'

function BtnGroup<T extends string>({ current, options, onSelect }: {
  current: T
  options: { value: T; label: string }[]
  onSelect: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          className={`font-mono text-[0.65rem] tracking-[0.08em] py-1 px-2.5 border cursor-pointer transition-all duration-150
            ${current === o.value
              ? 'border-accent bg-accent-dim text-accent'
              : 'border-edge bg-transparent text-ink-2'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="font-mono text-[0.58rem] tracking-[0.22em] uppercase text-accent-2 mb-2">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {children}
      </div>
    </section>
  )
}

function Row({ label, open, onToggle, children }: {
  label: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`block w-full text-left font-body text-[0.88rem] cursor-pointer py-[0.3rem] px-[0.4rem] -mx-[0.4rem] select-none rounded transition-all duration-200 bg-transparent border-none ${
          open
            ? 'text-accent bg-accent-dim/50'
            : 'text-ink hover:text-accent hover:bg-accent-dim/30 hover:translate-x-[2px]'
        }`}
      >
        {label}
      </button>
      {open && (
        <div className="pt-1 pb-[0.45rem]">
          {children}
        </div>
      )}
    </div>
  )
}

function Toggle({ label, value, onChange, title }: { label: string; value: boolean; onChange: (v: boolean) => void; title?: string }) {
  return (
    <div className="flex justify-between items-center py-[0.3rem]" title={title}>
      <span className="font-body text-[0.88rem] text-ink">{label}</span>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`w-[38px] h-[20px] rounded-[10px] border-none cursor-pointer relative shrink-0 transition-colors duration-200
          ${value ? 'bg-accent' : 'bg-edge'}`}
      >
        <span
          className="absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full bg-white transition-[left] duration-200"
          style={{ left: value ? '19px' : '3px' }}
        />
      </button>
    </div>
  )
}

export default function SettingsPanel() {
  const { panelOpen, closePanel, lang, theme, fontSize, siteFont, gameSpacing, emailNotifs, set, tagPresets, setTagPreset } = useSettings()
  const t = useT()
  const [openField, setOpenField] = useState<string | null>(null)
  const [expandedPreset, setExpandedPreset] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editTags, setEditTags] = useState('')

  function toggle(field: string) {
    setOpenField(prev => prev === field ? null : field)
  }

  function togglePreset(i: number) {
    if (expandedPreset === i) {
      setExpandedPreset(null)
    } else {
      setExpandedPreset(i)
      setEditName(tagPresets[i].name)
      setEditTags(tagPresets[i].tags)
    }
  }

  function savePreset() {
    if (expandedPreset === null) return
    setTagPreset(expandedPreset, { name: editName.trim(), tags: editTags.trim() })
    setExpandedPreset(null)
  }

  function clearPreset(i: number) {
    setTagPreset(i, { name: '', tags: '' })
    if (expandedPreset === i) setExpandedPreset(null)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && panelOpen) closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panelOpen, closePanel])

  return (
    <>
      {panelOpen && (
        <div onClick={closePanel} className="overlay z-299" />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.title') as string}
        className="fixed top-[60px] right-0 w-[370px] h-[calc(100vh-60px)] bg-surface border-l border-edge rounded-tl-lg z-300 overflow-y-auto flex flex-col gap-5 transition-transform duration-250 ease-out"
        style={{
          transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
          padding: '1.25rem 1.25rem 1.5rem',
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return
          const panel = e.currentTarget
          const focusable = panel.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          if (!focusable.length) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus() }
          } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus() }
          }
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-baseline">
          <h2 className="font-heading italic font-light text-[1.3rem] text-ink">
            {t('settings.title') as string}
          </h2>
          <button
            onClick={closePanel}
            aria-label={t('common.close') as string}
            className="bg-transparent border-none text-ink-2 cursor-pointer leading-none p-[0.2rem] flex items-center"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          <Row label={t('settings.language') as string} open={openField === 'lang'} onToggle={() => toggle('lang')}>
            <BtnGroup<Lang>
              current={lang}
              options={[
                { value: 'ru', label: 'Русский' },
                { value: 'en', label: 'English' },
              ]}
              onSelect={v => set('lang', v)}
            />
          </Row>

          <Row label={t('settings.theme') as string} open={openField === 'theme'} onToggle={() => toggle('theme')}>
            <div className="flex gap-2 flex-wrap">
              {([
                { value: 'light', label: t('settings.themePaper'), bg: '#f6f2e8', accent: '#7a1e1e', text: '#1c1813' },
                { value: 'sepia', label: t('settings.themeSepia'), bg: '#e8dfcf', accent: '#7b2323', text: '#211b15' },
                { value: 'ink', label: t('settings.themeInk'), bg: '#26211d', accent: '#b45151', text: '#f0e8dc' },
                { value: 'nocturne', label: t('settings.themeMidnight'), bg: '#181b1f', accent: '#8f5a7a', text: '#e7ebef' },
              ] as const).map(th => (
                <button
                  key={th.value}
                  onClick={() => set('theme', th.value)}
                  className={`flex flex-col items-center gap-1 p-2 border cursor-pointer transition-all ${theme === th.value ? 'border-accent' : 'border-edge'}`}
                  style={{ minWidth: 64 }}
                >
                  <div className="w-12 h-8 rounded-sm flex items-center justify-center" style={{ background: th.bg, border: '1px solid rgba(128,128,128,0.2)' }}>
                    <span style={{ color: th.accent, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.7rem' }}>Аа</span>
                  </div>
                  <span className="font-mono text-[0.55rem] tracking-[0.08em]">{th.label as string}</span>
                </button>
              ))}
            </div>
          </Row>

          <Row label={t('settings.fontSize') as string} open={openField === 'fontSize'} onToggle={() => toggle('fontSize')}>
            <BtnGroup<Settings['fontSize']>
              current={fontSize}
              options={[
                { value: 'small', label: t('settings.fontSmall') as string },
                { value: 'medium', label: t('settings.fontMedium') as string },
                { value: 'large', label: t('settings.fontLarge') as string },
              ]}
              onSelect={v => set('fontSize', v)}
            />
          </Row>

          <Row label={t('settings.spacing') as string} open={openField === 'spacing'} onToggle={() => toggle('spacing')}>
            <BtnGroup<Settings['gameSpacing']>
              current={gameSpacing}
              options={[
                { value: 'compact', label: t('settings.spacingCompact') as string },
                { value: 'normal', label: t('settings.spacingNormal') as string },
                { value: 'spacious', label: t('settings.spacingSpacious') as string },
              ]}
              onSelect={v => set('gameSpacing', v)}
            />
          </Row>

          <Row label={t('settings.font') as string} open={openField === 'font'} onToggle={() => toggle('font')}>
            <div className="relative">
              <button
                className="select-base w-full text-left"
                style={{ fontFamily: siteFont }}
                onClick={() => setOpenField(openField === 'font' ? null : 'font')}
              >
                {FONT_GROUPS.flatMap(g => g.fonts).find(f => f.value === siteFont)?.label || siteFont}
              </button>
              {openField === 'font' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-edge rounded shadow-lg z-10 max-h-80 overflow-y-auto">
                  {FONT_GROUPS.map((g, gi) => (
                    <div key={gi}>
                      <div className="sticky top-0 px-3 py-1.5 bg-surface-3 font-mono text-[0.58rem] tracking-[0.08em] uppercase text-accent-2">
                        {t(`editor.${g.key}`) as string}
                      </div>
                      {g.fonts.map(f => (
                        <button
                          key={f.value}
                          onClick={() => {
                            set('siteFont', f.value)
                            setOpenField(null)
                          }}
                          className={`w-full text-left px-3 py-2 transition-colors ${
                            siteFont === f.value ? 'bg-accent-dim text-accent' : 'text-ink hover:bg-accent-dim/30'
                          }`}
                          style={{ fontFamily: f.value }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Row>

          <Toggle label={t('settings.emailNotifs') as string} value={emailNotifs} onChange={v => set('emailNotifs', v)} />
        </div>

        <div className="h-px bg-edge" />

        {/* === Tag Presets === */}
        <Section title={t('settings.tagPresets') as string}>
          {tagPresets.map((preset: TagPreset, i: number) => {
            const isOpen = expandedPreset === i
            const hasContent = !!preset.tags
            return (
              <div
                key={i}
                className="transition-[border-color] duration-150"
                style={{
                  border: `1px solid ${isOpen ? 'var(--accent)' : hasContent ? 'var(--border)' : 'var(--bg-3)'}`,
                  background: hasContent || isOpen ? 'var(--bg-2)' : 'transparent',
                }}
              >
                <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 min-h-[32px]">
                  <button
                    type="button"
                    onClick={() => togglePreset(i)}
                    aria-expanded={isOpen}
                    className="overflow-hidden whitespace-nowrap text-ellipsis flex-1 text-left bg-transparent border-none cursor-pointer"
                    style={{
                      fontFamily: hasContent ? 'var(--serif-body)' : 'var(--mono)',
                      fontSize: hasContent ? '0.82rem' : '0.58rem',
                      letterSpacing: hasContent ? 'normal' : '0.1em',
                      textTransform: hasContent ? 'none' : 'uppercase',
                      color: hasContent ? 'var(--text)' : 'var(--border)',
                    }}
                  >
                    {hasContent ? (preset.name || `${t('settings.presetName') as string} ${i + 1}`) : `${t('settings.presetName') as string} ${i + 1} — ${t('settings.presetEmpty') as string}`}
                  </button>
                  <div className="flex gap-0.5 shrink-0 items-center">
                    {hasContent && !isOpen && (
                      <button
                        onClick={e => { e.stopPropagation(); clearPreset(i) }}
                        title={t('settings.clearPreset') as string}
                        aria-label={t('settings.clearPreset') as string}
                        className="bg-transparent border-none text-ink-2 cursor-pointer px-[0.2rem] py-[0.1rem] leading-none opacity-50 hover:opacity-100 flex items-center"
                      >
                        <X size={11} strokeWidth={2} aria-hidden="true" />
                      </button>
                    )}
                    <span
                      className="text-ink-2 transition-transform duration-150 inline-flex"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                    >
                      <ChevronDown size={10} aria-hidden="true" />
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-2.5 pb-2 flex flex-col gap-1.5">
                    <input
                      type="text"
                      placeholder={`${t('settings.presetNamePlaceholder') as string} ${i + 1}`}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="input-base text-[0.82rem]"
                    />
                    <textarea
                      placeholder={t('settings.tagsPlaceholder') as string}
                      value={editTags}
                      onChange={e => setEditTags(e.target.value)}
                      rows={2}
                      className="input-base text-[0.82rem] resize-y leading-normal"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => setExpandedPreset(null)} className="btn-ghost py-1 px-2">
                        {t('settings.cancelPreset') as string}
                      </button>
                      <button onClick={savePreset} className="btn-primary text-[0.8rem] py-1 px-2.5">
                        {t('settings.savePreset') as string}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </Section>
      </div>
    </>
  )
}
