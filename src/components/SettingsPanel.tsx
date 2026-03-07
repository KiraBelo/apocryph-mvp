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
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.08em',
            padding: '0.25rem 0.6rem',
            border: `1px solid ${current === o.value ? 'var(--accent)' : 'var(--border)'}`,
            background: current === o.value ? 'var(--accent-dim)' : 'none',
            color: current === o.value ? 'var(--accent)' : 'var(--text-2)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
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
      <p style={{
        fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: '0.22em',
        textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '0.5rem',
      }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
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
        style={{
          fontFamily: 'var(--serif-body)', fontSize: '0.88rem', color: 'var(--text)',
          cursor: 'pointer', padding: '0.3rem 0', userSelect: 'none',
        }}
      >
        {label}
      </div>
      {open && (
        <div style={{ padding: '0.25rem 0 0.45rem' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Toggle({ label, value, onChange, title }: { label: string; value: boolean; onChange: (v: boolean) => void; title?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0' }} title={title}>
      <span style={{ fontFamily: 'var(--serif-body)', fontSize: '0.88rem', color: 'var(--text)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        style={{
          width: '38px', height: '20px', borderRadius: '10px', border: 'none',
          background: value ? 'var(--accent)' : 'var(--border)',
          cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          left: value ? '19px' : '3px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
        }} />
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
        <div
          onClick={closePanel}
          style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(0,0,0,0.35)' }}
        />
      )}

      <div style={{
        position: 'fixed',
        top: '60px',
        right: 0,
        width: '300px',
        height: 'calc(100vh - 60px)',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--border)',
        borderTopLeftRadius: '8px',
        zIndex: 300,
        overflowY: 'auto',
        transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        padding: '1.25rem 1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 300, fontSize: '1.3rem', color: 'var(--text)' }}>
            Настройки
          </h2>
          <button onClick={closePanel} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1, padding: '0.2rem' }}>
            ✕
          </button>
        </div>

        {/* === Вид сайта === */}
        <Section title="Вид сайта">
          <Row label="Тема" open={openField === 'theme'} onToggle={() => toggle('theme')}>
            <BtnGroup<Settings['theme']>
              current={theme}
              options={[
                { value: 'light', label: 'Светлая' },
                { value: 'dark', label: 'Тёмная' },
              ]}
              onSelect={v => set('theme', v)}
            />
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
              style={{
                fontFamily: siteFont,
                fontSize: '0.88rem',
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '0.35rem 0.5rem',
                cursor: 'pointer',
                width: '100%',
                outline: 'none',
              }}
            >
              {FONT_GROUPS.flatMap((g, gi) => [
                <option key={`g-${gi}`} disabled style={{ fontWeight: 'bold' }}>— {g.label} —</option>,
                ...g.fonts.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                )),
              ])}
            </select>
          </Row>
        </Section>

        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* === Вид игры === */}
        <Section title="Вид игры">
          <Row label="Раскладка постов" open={openField === 'layout'} onToggle={() => toggle('layout')}>
            <BtnGroup<GameLayout>
              current={gameLayout}
              options={[
                { value: 'dialog', label: 'Диалог' },
                { value: 'feed', label: 'Лента' },
                { value: 'book', label: 'Книга' },
              ]}
              onSelect={v => set('gameLayout', v)}
            />
            <p style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', letterSpacing: '0.06em', color: 'var(--text-2)', marginTop: '0.3rem' }}>
              {gameLayout === 'dialog' && 'Мой пост справа, чужой слева'}
              {gameLayout === 'feed' && 'Все посты подряд, аватарка слева'}
              {gameLayout === 'book' && 'Без аватарок, только имя и текст'}
            </p>
          </Row>

          <Toggle label="Заметки" title="Личные заметки к каждой игре" value={notesEnabled} onChange={v => set('notesEnabled', v)} />
          <Toggle label="Уведомления на e-mail" value={emailNotifs} onChange={v => set('emailNotifs', v)} />
        </Section>

        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* === Наборы тегов === */}
        <Section title="Наборы тегов">
          {tagPresets.map((preset: TagPreset, i: number) => {
            const isOpen = expandedPreset === i
            const hasContent = !!preset.tags
            return (
              <div key={i} style={{ border: `1px solid ${isOpen ? 'var(--accent)' : hasContent ? 'var(--border)' : 'var(--bg-3)'}`, background: hasContent || isOpen ? 'var(--bg-2)' : 'transparent', transition: 'border-color 0.15s' }}>
                <div
                  onClick={() => togglePreset(i)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', padding: '0.4rem 0.6rem', cursor: 'pointer', minHeight: '32px' }}
                >
                  <span style={{
                    fontFamily: hasContent ? 'var(--serif-body)' : 'var(--mono)',
                    fontSize: hasContent ? '0.82rem' : '0.58rem',
                    letterSpacing: hasContent ? 'normal' : '0.1em',
                    textTransform: hasContent ? 'none' : 'uppercase',
                    color: hasContent ? 'var(--text)' : 'var(--border)',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1,
                  }}>
                    {hasContent ? (preset.name || `Набор ${i + 1}`) : `Набор ${i + 1} — пусто`}
                  </span>
                  <div style={{ display: 'flex', gap: '0.15rem', flexShrink: 0, alignItems: 'center' }}>
                    {hasContent && !isOpen && (
                      <button
                        onClick={e => { e.stopPropagation(); clearPreset(i) }}
                        title="Очистить"
                        style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.7rem', padding: '0.1rem 0.2rem', lineHeight: 1, opacity: 0.5 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                      >
                        ✕
                      </button>
                    )}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--text-2)', transition: 'transform 0.15s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                      ▾
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ padding: '0 0.6rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <input
                      type="text"
                      placeholder={`Название набора ${i + 1}`}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={editInput}
                    />
                    <textarea
                      placeholder="Теги через запятую"
                      value={editTags}
                      onChange={e => setEditTags(e.target.value)}
                      rows={2}
                      style={{ ...editInput, resize: 'vertical', lineHeight: 1.5 }}
                    />
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setExpandedPreset(null)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: '0.08em', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
                        Отмена
                      </button>
                      <button onClick={savePreset} style={{ background: 'var(--accent)', color: '#fff', border: 'none', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.8rem', padding: '0.25rem 0.65rem', cursor: 'pointer' }}>
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

const editInput: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)',
  fontFamily: 'var(--serif-body)', fontSize: '0.82rem',
  padding: '0.3rem 0.5rem', outline: 'none', width: '100%',
}
