'use client'
import { useEffect, useState } from 'react'
import { useSettings, type Settings } from './SettingsContext'
import type { TagPreset } from './SettingsContext'

function BtnGroup<T extends string>({ current, options, onSelect }: {
  current: T
  options: { value: T; label: string }[]
  onSelect: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            padding: '0.3rem 0.7rem',
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
        fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.22em',
        textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '1rem',
      }}>
        § {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {children}
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{
        fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '0.45rem',
      }}>
        {label}
      </p>
      {children}
    </div>
  )
}

export default function SettingsPanel() {
  const { panelOpen, closePanel, theme, fontSize, gameFont, gameSpacing, emailNotifs, set, tagPresets, setTagPreset } = useSettings()
  const [editingPreset, setEditingPreset] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editTags, setEditTags] = useState('')

  function startEdit(i: number) {
    setEditingPreset(i)
    setEditName(tagPresets[i].name)
    setEditTags(tagPresets[i].tags)
  }

  function saveEdit() {
    if (editingPreset === null) return
    setTagPreset(editingPreset, { name: editName.trim(), tags: editTags.trim() })
    setEditingPreset(null)
  }

  function cancelEdit() {
    setEditingPreset(null)
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
      {/* Backdrop */}
      {panelOpen && (
        <div
          onClick={closePanel}
          style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(0,0,0,0.35)' }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '60px',
        right: 0,
        width: '300px',
        height: 'calc(100vh - 60px)',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--border)',
        zIndex: 300,
        overflowY: 'auto',
        transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 300,
            fontSize: '1.4rem', color: 'var(--text)',
          }}>
            Настройки
          </h2>
          <button
            onClick={closePanel}
            style={{
              background: 'none', border: 'none', color: 'var(--text-2)',
              cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0.2rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Внешний вид */}
        <Section title="Внешний вид">
          <Field label="Тема">
            <BtnGroup<Settings['theme']>
              current={theme}
              options={[
                { value: 'light', label: 'Светлая' },
                { value: 'dark', label: 'Тёмная' },
              ]}
              onSelect={v => set('theme', v)}
            />
          </Field>
          <Field label="Размер текста">
            <BtnGroup<Settings['fontSize']>
              current={fontSize}
              options={[
                { value: 'small', label: 'Мелкий' },
                { value: 'medium', label: 'Обычный' },
                { value: 'large', label: 'Крупный' },
              ]}
              onSelect={v => set('fontSize', v)}
            />
          </Field>
        </Section>

        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* Отображение игры */}
        <Section title="Отображение игры">
          <Field label="Шрифт диалога">
            <BtnGroup<Settings['gameFont']>
              current={gameFont}
              options={[
                { value: 'serif', label: 'Гарамон' },
                { value: 'serif-body', label: 'ЕБ Гарамон' },
                { value: 'mono', label: 'Курьер' },
              ]}
              onSelect={v => set('gameFont', v)}
            />
          </Field>
          <Field label="Отступы между постами">
            <BtnGroup<Settings['gameSpacing']>
              current={gameSpacing}
              options={[
                { value: 'compact', label: 'Компактно' },
                { value: 'normal', label: 'Обычно' },
                { value: 'spacious', label: 'Просторно' },
              ]}
              onSelect={v => set('gameSpacing', v)}
            />
          </Field>
        </Section>

        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* Уведомления */}
        <Section title="Уведомления">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--serif-body)', fontSize: '0.95rem', color: 'var(--text)' }}>
              Email о новых постах
            </span>
            <button
              onClick={() => set('emailNotifs', !emailNotifs)}
              role="switch"
              aria-checked={emailNotifs}
              style={{
                width: '42px', height: '22px', borderRadius: '11px', border: 'none',
                background: emailNotifs ? 'var(--accent)' : 'var(--border)',
                cursor: 'pointer', position: 'relative', flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: '3px',
                left: emailNotifs ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </Section>

        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* Наборы тегов */}
        <Section title="Наборы тегов">
          <p style={{
            fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: '0.08em',
            color: 'var(--text-2)', marginBottom: '0.25rem',
          }}>
            Сохраняйте теги из поиска в ленте
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {tagPresets.map((preset: TagPreset, i: number) => (
              <div key={i} style={{ border: `1px solid ${editingPreset === i ? 'var(--accent)' : preset.tags ? 'var(--border)' : 'var(--bg-3)'}`, background: preset.tags || editingPreset === i ? 'var(--bg-2)' : 'transparent' }}>

                {/* Preview row */}
                {editingPreset !== i && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.45rem 0.65rem', minHeight: '38px' }}>
                    {preset.tags ? (
                      <>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <p style={{ fontFamily: 'var(--serif-body)', fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.1rem' }}>
                            {preset.name || `Набор ${i + 1}`}
                          </p>
                          <p style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: '0.05em', color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {preset.tags}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.1rem', flexShrink: 0 }}>
                          <button onClick={() => startEdit(i)} title="Редактировать" style={iconBtn}>✎</button>
                          <button onClick={() => setTagPreset(i, { name: '', tags: '' })} title="Очистить" style={iconBtn}>✕</button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--border)' }}>
                          Набор {i + 1} — пусто
                        </span>
                        <button onClick={() => startEdit(i)} title="Добавить теги" style={{ ...iconBtn, color: 'var(--accent-2)' }}>+ добавить</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit form */}
                {editingPreset === i && (
                  <div style={{ padding: '0.6rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <input
                      type="text"
                      placeholder={`Название набора ${i + 1}`}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={editInput}
                    />
                    <textarea
                      placeholder="Теги через запятую: аниме, наруто, дружба"
                      value={editTags}
                      onChange={e => setEditTags(e.target.value)}
                      rows={2}
                      style={{ ...editInput, resize: 'vertical', lineHeight: 1.5 }}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button onClick={cancelEdit} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.08em', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                        Отмена
                      </button>
                      <button onClick={saveEdit} style={{ background: 'var(--accent)', color: '#fff', border: 'none', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.85rem', padding: '0.3rem 0.8rem', cursor: 'pointer' }}>
                        Сохранить →
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-2)',
  cursor: 'pointer', fontSize: '0.78rem', padding: '0.1rem 0.25rem',
  lineHeight: 1,
}

const editInput: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)',
  fontFamily: 'var(--serif-body)', fontSize: '0.85rem',
  padding: '0.35rem 0.6rem', outline: 'none', width: '100%',
}
