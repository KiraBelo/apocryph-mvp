'use client'
import { useEffect, useState } from 'react'
import { useSettings, type Settings, type GameLayout } from './SettingsContext'
import type { TagPreset } from './SettingsContext'
import { FONT_GROUPS, ALL_FONTS } from '@/lib/fonts'

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
      <div
        onClick={onToggle}
        className={`font-body text-[0.88rem] cursor-pointer py-[0.3rem] px-[0.4rem] -mx-[0.4rem] select-none rounded transition-all duration-200 ${
          open
            ? 'text-accent bg-accent-dim/50'
            : 'text-ink hover:text-accent hover:bg-accent-dim/30 hover:translate-x-[2px]'
        }`}
      >
        {label}
      </div>
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
  const { panelOpen, closePanel, theme, fontSize, siteFont, gameSpacing, gameLayout, emailNotifs, notesEnabled, set, tagPresets, setTagPreset } = useSettings()
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
        className="fixed top-[60px] right-0 w-[370px] h-[calc(100vh-60px)] bg-surface border-l border-edge rounded-tl-lg z-300 overflow-y-auto flex flex-col gap-5 transition-transform duration-250 ease-out"
        style={{
          transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
          padding: '1.25rem 1.25rem 1.5rem',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-baseline">
          <h2 className="font-heading italic font-light text-[1.3rem] text-ink">
            Настройки
          </h2>
          <button onClick={closePanel} className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.9rem] leading-none p-[0.2rem]">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          <Row label="Тема" open={openField === 'theme'} onToggle={() => toggle('theme')}>
            <select
              value={theme}
              onChange={e => set('theme', e.target.value as Settings['theme'])}
              className="select-base"
            >
              <option value="light">Бумага</option>
              <option value="sepia">Сепия</option>
              <option value="ink">Чернила</option>
              <option value="nocturne">Полночь</option>
            </select>
          </Row>

          <Row label="Размер текста" open={openField === 'fontSize'} onToggle={() => toggle('fontSize')}>
            <BtnGroup<Settings['fontSize']>
              current={fontSize}
              options={[
                { value: 'small', label: 'Мелкий' },
                { value: 'medium', label: 'Обычный' },
                { value: 'large', label: 'Крупный' },
              ]}
              onSelect={v => set('fontSize', v)}
            />
          </Row>

          <Row label="Отступы между постами" open={openField === 'spacing'} onToggle={() => toggle('spacing')}>
            <BtnGroup<Settings['gameSpacing']>
              current={gameSpacing}
              options={[
                { value: 'compact', label: 'Компактно' },
                { value: 'normal', label: 'Обычно' },
                { value: 'spacious', label: 'Просторно' },
              ]}
              onSelect={v => set('gameSpacing', v)}
            />
          </Row>

          <Row label="Шрифт" open={openField === 'font'} onToggle={() => toggle('font')}>
            <select
              value={siteFont}
              onChange={e => set('siteFont', e.target.value)}
              className="select-base"
              style={{ fontFamily: siteFont }}
            >
              {FONT_GROUPS.flatMap((g, gi) => [
                <option key={`g-${gi}`} disabled style={{ fontWeight: 'bold' }}>— {g.label} —</option>,
                ...g.fonts.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                )),
              ])}
            </select>
          </Row>

          <Toggle label="Уведомления на e-mail" value={emailNotifs} onChange={v => set('emailNotifs', v)} />
        </div>

        <div className="h-px bg-edge" />

        {/* === Наборы тегов === */}
        <Section title="Наборы тегов">
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
                <div
                  onClick={() => togglePreset(i)}
                  className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 cursor-pointer min-h-[32px]"
                >
                  <span className="overflow-hidden whitespace-nowrap text-ellipsis flex-1" style={{
                    fontFamily: hasContent ? 'var(--serif-body)' : 'var(--mono)',
                    fontSize: hasContent ? '0.82rem' : '0.58rem',
                    letterSpacing: hasContent ? 'normal' : '0.1em',
                    textTransform: hasContent ? 'none' : 'uppercase',
                    color: hasContent ? 'var(--text)' : 'var(--border)',
                  }}>
                    {hasContent ? (preset.name || `Набор ${i + 1}`) : `Набор ${i + 1} — пусто`}
                  </span>
                  <div className="flex gap-0.5 shrink-0 items-center">
                    {hasContent && !isOpen && (
                      <button
                        onClick={e => { e.stopPropagation(); clearPreset(i) }}
                        title="Очистить"
                        className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.7rem] px-[0.2rem] py-[0.1rem] leading-none opacity-50 hover:opacity-100"
                      >
                        ✕
                      </button>
                    )}
                    <span
                      className="font-mono text-[0.55rem] text-ink-2 transition-transform duration-150 inline-block"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                    >
                      ▾
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-2.5 pb-2 flex flex-col gap-1.5">
                    <input
                      type="text"
                      placeholder={`Название набора ${i + 1}`}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="input-base text-[0.82rem]"
                    />
                    <textarea
                      placeholder="Теги через запятую"
                      value={editTags}
                      onChange={e => setEditTags(e.target.value)}
                      rows={2}
                      className="input-base text-[0.82rem] resize-y leading-normal"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => setExpandedPreset(null)} className="btn-ghost py-1 px-2">
                        Отмена
                      </button>
                      <button onClick={savePreset} className="btn-primary text-[0.8rem] py-1 px-2.5">
                        Сохранить
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
