'use client'
import { useT } from '../SettingsContext'
import RichEditor from '../RichEditor'

interface MessageEditorProps {
  isOoc: boolean
  isLeft: boolean
  isFrozen: boolean
  isFinished: boolean
  fullscreen: boolean
  editingId: string | null
  editorCollapsed: boolean
  setEditorCollapsed: (v: boolean) => void
  editorPinned: boolean
  setEditorPinned: (v: boolean) => void
  // IC editor
  content: string
  setContent: (v: string) => void
  sendKey: number
  // OOC editor
  oocContent: string
  setOocContent: (v: string) => void
  oocSendKey: number
  // Actions
  sending: boolean
  editSaving: boolean
  onSend: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  // Dice
  showDicePanel: boolean
  setShowDicePanel: (v: boolean | ((prev: boolean) => boolean)) => void
  diceSides: string
  setDiceSides: (v: string) => void
  diceRolling: boolean
  onRollDice: () => void
}

export default function MessageEditor({
  isOoc, isLeft, isFrozen, isFinished, fullscreen,
  editingId, editorCollapsed, setEditorCollapsed,
  editorPinned, setEditorPinned,
  content, setContent, sendKey,
  oocContent, setOocContent, oocSendKey,
  sending, editSaving, onSend, onSaveEdit, onCancelEdit,
  showDicePanel, setShowDicePanel, diceSides, setDiceSides, diceRolling, onRollDice,
}: MessageEditorProps) {
  const t = useT()

  // Don't render if not allowed to post
  if (isLeft || isFrozen || (isFinished && !isOoc)) return null

  const currentContent = isOoc ? oocContent : content
  const isDisabled = editSaving || sending || !currentContent.trim()

  return (
    <div className="shrink-0" onMouseEnter={() => editorCollapsed && setEditorCollapsed(false)} style={{
      borderTop: `1px solid ${editingId && !isOoc ? 'var(--accent)' : isOoc ? 'var(--text-2)' : 'var(--border)'}`,
      background: isOoc ? 'var(--bg-3)' : 'var(--bg-2)',
    }}>
      {editorCollapsed && !editingId ? (
        <button
          onClick={() => setEditorCollapsed(false)}
          className="w-full bg-transparent border-none p-[0.55rem_1.25rem] cursor-pointer flex items-center justify-center text-ink-2 opacity-50"
          title={t('game.writePost') as string}
        >
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="18" height="12" rx="2"/>
            <line x1="4" y1="5" x2="4" y2="5" strokeWidth="2"/><line x1="7" y1="5" x2="7" y2="5" strokeWidth="2"/>
            <line x1="10" y1="5" x2="10" y2="5" strokeWidth="2"/><line x1="13" y1="5" x2="13" y2="5" strokeWidth="2"/>
            <line x1="16" y1="5" x2="16" y2="5" strokeWidth="2"/>
            <line x1="4" y1="9" x2="4" y2="9" strokeWidth="2"/><line x1="7" y1="9" x2="16" y2="9" strokeWidth="2"/>
          </svg>
        </button>
      ) : (
        <div style={{ animation: 'fadeInUp 0.3s ease' }}>
          {editingId && !isOoc && (
            <div className="flex items-center justify-between px-3 py-1 bg-accent-dim border-b border-accent">
              <span className="font-mono text-[0.62rem] text-ink-2 tracking-[0.06em]">
                {t('game.editingPost') as string}
              </span>
              <button onClick={onCancelEdit} className="bg-transparent border-none text-ink-2 cursor-pointer font-mono text-[0.62rem] p-0">
                {t('game.cancelEdit') as string}
              </button>
            </div>
          )}
          {isOoc
            ? <RichEditor key={oocSendKey} content={oocContent} onChange={setOocContent} placeholder={t('game.oocPlaceholder') as string} minHeight="80px" />
            : <RichEditor key={sendKey} content={content} onChange={setContent} placeholder={t('game.icPlaceholder') as string} minHeight="100px" onDiceClick={!editingId ? () => setShowDicePanel(v => !v) : undefined} diceActive={showDicePanel} />
          }
          {showDicePanel && !editingId && (
            <div className="flex items-center gap-2 px-3 py-[0.4rem] bg-surface-2 border-t border-edge">
              <span className="font-mono text-[0.7rem] text-ink-2 tracking-[0.08em]">d</span>
              <input
                type="number" min={2} max={100} value={diceSides}
                onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 0 && Number(v) <= 100)) setDiceSides(v) }}
                onKeyDown={e => { if (e.key === 'Enter') onRollDice() }}
                className="w-14 font-mono text-[0.8rem] bg-surface border border-edge text-ink p-[0.2rem_0.4rem] text-center"
              />
              <span className="font-mono text-[0.55rem] text-edge tracking-[0.04em]">2&ndash;100</span>
              <button
                onClick={onRollDice} disabled={diceRolling || isNaN(parseInt(diceSides)) || parseInt(diceSides) < 2 || parseInt(diceSides) > 100}
                className="bg-accent text-white font-heading italic text-[0.85rem] border-none p-[0.25rem_0.9rem] cursor-pointer"
                style={{ opacity: (diceRolling || isNaN(parseInt(diceSides)) || parseInt(diceSides) < 2 || parseInt(diceSides) > 100) ? 0.4 : 1 }}
              >
                {diceRolling ? '...' : t('game.roll') as string}
              </button>
            </div>
          )}
          <div className={`flex items-center gap-2 px-3 py-2 ${!editingId ? 'justify-between' : 'justify-end'}`}>
            <div className="flex items-center gap-2">
              {!editingId && (
                <button
                  onClick={() => setEditorPinned(!editorPinned)}
                  title={editorPinned ? t('game.unpinEditor') as string : t('game.pinEditor') as string}
                  className="bg-transparent border-none cursor-pointer p-[0.2rem_0.4rem] leading-none flex items-center"
                  style={{ color: editorPinned ? 'var(--accent)' : 'var(--text-2)', opacity: editorPinned ? 1 : 0.5 }}
                >
                  {editorPinned ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                    </svg>
                  )}
                </button>
              )}
              {fullscreen && !editingId && (
                <button onClick={() => setEditorCollapsed(true)} title={t('game.collapseEditor') as string} className="bg-transparent border-none text-ink-2 cursor-pointer font-mono text-[0.75rem] p-[0.2rem_0.5rem] leading-none">
                  {t('game.collapseEditorBtn') as string}
                </button>
              )}
            </div>
            <button
              onClick={editingId && !isOoc ? onSaveEdit : onSend}
              disabled={isDisabled}
              className="text-white font-heading italic text-[0.95rem] border-none p-[0.55rem_1.5rem] cursor-pointer"
              style={{
                background: isOoc ? 'var(--text-2)' : 'var(--accent)',
                opacity: isDisabled ? 0.6 : 1,
              }}
            >
              {(sending || editSaving) ? '...' : editingId && !isOoc ? t('game.sendSave') as string : isOoc ? t('game.sendOoc') as string : t('game.sendIc') as string}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
