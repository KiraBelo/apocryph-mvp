'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import Underline from '@tiptap/extension-underline'
import { useState, useEffect, useRef } from 'react'
import { FONT_GROUPS } from '@/lib/fonts'

// Custom TipTap node for SMS meta line (time + checkmarks)
const SMSMeta = Node.create({
  name: 'smsMeta',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'p.sms-meta' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes({ class: 'sms-meta' }, HTMLAttributes), 0]
  },
})

// Custom TipTap node for SMS-style bubbles
const SMSBlock = Node.create({
  name: 'smsBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'div.sms-bubble' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ class: 'sms-bubble' }, HTMLAttributes), 0]
  },
})

// Custom Tiptap node for music embeds
const IframeNode = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100%' },
      height: { default: '152' },
      frameborder: { default: '0' },
      allow: { default: null },
      allowtransparency: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'iframe[src]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(HTMLAttributes)]
  },
})


const EMOJI_LIST = [
  '😊','😂','🥺','😍','😭','😏','😈','🤔','🙄','😳','🥰','😤',
  '🤣','😅','😎','🥲','😢','😡','🤗','😴','🤭','😱','🫠','🫣',
  '❤️','🖤','💔','💜','🔥','✨','💫','⭐','🌙','🌹','🗡️','⚔️',
  '🎭','🎪','👑','💀','🦊','🐺','🐉','🦇','🌑','🌕','🕯️','📖',
  '👀','🫶','🤝','✍️','💭','💬','🎵','🎶','💐','🥀','🍷','☕',
]

function EmojiDropdown({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
      background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      padding: '0.5rem', width: '320px', maxHeight: '260px', overflowY: 'auto',
      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px',
    }}>
      {EMOJI_LIST.map(e => (
        <button key={e} type="button" onClick={() => onSelect(e)} style={{
          background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer',
          padding: '0.2rem', borderRadius: '4px', lineHeight: 1,
        }}
          onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--bg-3)' }}
          onMouseLeave={ev => { ev.currentTarget.style.background = 'none' }}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

const COLORS = ['#1c1813', '#8b1a1a', '#1a4a8b', '#1a7a3a', '#5a4e40', '#7c1a8b', '#8b6a1a']
const HIGHLIGHTS = ['#fff3cd', '#fce4e4', '#e4f4e4', '#e4eef4', '#f4e4f4', '#e4f4f4']

interface Props {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  onDiceClick?: () => void
  diceActive?: boolean
}

export default function RichEditor({ content, onChange, placeholder = 'Начни писать...', minHeight = '180px', onDiceClick, diceActive }: Props) {
  const [musicOpen, setMusicOpen] = useState(false)
  const [embedInput, setEmbedInput] = useState('')
  const [embedError, setEmbedError] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [translating, setTranslating] = useState(false)
  const emojiRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontFamily,
      Underline,
      IframeNode,
      SMSMeta,
      SMSBlock,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        style: `min-height: ${minHeight}; padding: 1rem; outline: none;`,
        'data-placeholder': placeholder,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [])

  // Close emoji picker on click outside
  useEffect(() => {
    if (!emojiOpen) return
    function close(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [emojiOpen])

  async function translateContent() {
    if (!editor || translating) return
    const text = editor.getText().trim()
    if (!text) return
    setTranslating(true)
    try {
      const isRu = /[а-яёА-ЯЁ]/.test(text)
      const langpair = isRu ? 'ru|en' : 'en|ru'
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 4500))}&langpair=${langpair}`)
      const data = await res.json()
      const translated = data?.responseData?.translatedText
      if (translated) {
        editor.commands.setContent(`<p>${translated}</p>`)
      }
    } catch { /* ignore */ }
    setTranslating(false)
  }

  function insertEmbed() {
    if (!editor) return
    setEmbedError('')

    const parser = new DOMParser()
    const doc = parser.parseFromString(embedInput, 'text/html')
    const iframe = doc.querySelector('iframe')

    if (!iframe) {
      setEmbedError('Не найден iframe в коде')
      return
    }

    const src = iframe.getAttribute('src') ?? ''
    const allowed =
      src.startsWith('https://open.spotify.com/embed/') ||
      src.startsWith('https://music.yandex.ru/iframe/')

    if (!allowed) {
      setEmbedError('Разрешены только Spotify и Яндекс.Музыка')
      return
    }

    editor.chain().focus().insertContent({
      type: 'iframe',
      attrs: {
        src,
        width: iframe.getAttribute('width') || '100%',
        height: iframe.getAttribute('height') || '152',
        frameborder: iframe.getAttribute('frameborder') || '0',
        allow: iframe.getAttribute('allow') || null,
        allowtransparency: iframe.getAttribute('allowtransparency') || null,
      },
    }).run()

    setMusicOpen(false)
    setEmbedInput('')
  }

  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, children: React.ReactNode, title?: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: active ? 700 : 400,
        background: active ? 'var(--accent-dim)' : 'none',
        border: 'none', color: active ? 'var(--accent)' : 'var(--text-2)',
        padding: '0.25rem 0.45rem', cursor: 'pointer', borderRadius: '2px',
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  )

  const sep = () => (
    <span style={{ width: '1px', background: 'var(--border)', margin: '0 0.2rem', alignSelf: 'stretch' }} />
  )

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--bg-2)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.15rem',
        padding: '0.45rem 0.65rem', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-3)',
      }}>
        {/* Text style */}
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <strong>B</strong>, 'Жирный (Ctrl+B)')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <em>I</em>, 'Курсив (Ctrl+I)')}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <span style={{ textDecoration: 'underline' }}>U</span>, 'Подчёркнутый (Ctrl+U)')}
        {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), <span style={{ textDecoration: 'line-through' }}>S</span>, 'Зачёркнутый (Ctrl+Shift+S)')}

        {sep()}

        {/* Headings */}
        {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1')}
        {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2')}
        {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3')}

        {sep()}

        {/* Lists */}
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), '• —', 'Список')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1.', 'Нумерованный')}
        {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), '❝', 'Цитата')}

        {sep()}

        {/* Alignment */}
        {btn(editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), '⇐', 'По левому краю')}
        {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), '⇔', 'По центру')}
        {btn(editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), '⇒', 'По правому краю')}
        {btn(editor.isActive({ textAlign: 'justify' }), () => editor.chain().focus().setTextAlign('justify').run(), '≡', 'По ширине')}

        {sep()}

        {/* Font family */}
        <select
          onChange={e => {
            if (e.target.value) editor.chain().focus().setFontFamily(e.target.value).run()
            else editor.chain().focus().unsetFontFamily().run()
          }}
          style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
          title="Шрифт"
        >
          <option value="">По умолчанию</option>
          {FONT_GROUPS.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </optgroup>
          ))}
        </select>

        {sep()}

        {/* Text color */}
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', color: 'var(--text-2)', marginRight: '0.15rem' }}>A</span>
        {COLORS.map(c => (
          <button
            key={c} type="button"
            onClick={() => editor.chain().focus().setColor(c).run()}
            style={{ width: '14px', height: '14px', background: c, border: editor.isActive('textStyle', { color: c }) ? '2px solid var(--text)' : '1px solid var(--border)', cursor: 'pointer', borderRadius: '2px' }}
            title={c}
          />
        ))}

        {sep()}

        {/* Highlight */}
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', color: 'var(--text-2)', marginRight: '0.15rem' }}>HL</span>
        {HIGHLIGHTS.map(c => (
          <button
            key={c} type="button"
            onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
            style={{ width: '14px', height: '14px', background: c, border: '1px solid var(--border)', cursor: 'pointer', borderRadius: '2px' }}
            title={`Выделить: ${c}`}
          />
        ))}

        {sep()}

        {/* Horizontal rule (scene separator) */}
        {btn(false, () => editor.chain().focus().setHorizontalRule().run(), '―', 'Разделитель сцен')}

        {sep()}

        {/* Clear + Music embed + SMS + Emoji */}
        {btn(false, () => editor.chain().focus().unsetAllMarks().clearNodes().run(), '✕', 'Очистить форматирование')}
        {btn(musicOpen, () => { setMusicOpen(m => !m); setEmbedError('') }, <span style={{ fontSize: '1rem', lineHeight: 1 }}>♫</span>, 'Встроить музыку')}
        {btn(editor.isActive('smsBlock'), () => {
          // Check if any content is already inside smsBlock
          let hasSms = false
          editor.state.doc.descendants((node) => {
            if (node.type.name === 'smsBlock') hasSms = true
          })
          if (hasSms) {
            editor.chain().focus().selectAll().lift('smsBlock').run()
            // Remove sms-meta paragraphs after unwrap
            const html = editor.getHTML()
            const cleaned = html.replace(/<p class="sms-meta">.*?<\/p>/g, '')
            editor.commands.setContent(cleaned)
          } else {
            // Build timestamp
            const now = new Date()
            const hh = String(now.getHours()).padStart(2, '0')
            const mm = String(now.getMinutes()).padStart(2, '0')
            const metaHtml = `<p class="sms-meta">${hh}:${mm}</p>`
            // Wrap all content in smsBlock with timestamp at top
            editor.chain().focus().selectAll().wrapIn('smsBlock').run()
            const html = editor.getHTML()
            // Insert meta right after opening <div class="sms-bubble">
            const patched = html.replace(/<div class="sms-bubble">/, `<div class="sms-bubble">${metaHtml}`)
            editor.commands.setContent(patched)
          }
        }, <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="0.5" fill="currentColor"/><circle cx="12" cy="10" r="0.5" fill="currentColor"/><circle cx="15" cy="10" r="0.5" fill="currentColor"/></svg>, 'SMS-пузырь')}
        <div ref={emojiRef} style={{ position: 'relative', display: 'inline-flex' }}>
          {btn(emojiOpen, () => setEmojiOpen(o => !o), <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>☺</span>, 'Эмодзи')}
          {emojiOpen && <EmojiDropdown onSelect={(emoji: string) => { editor.chain().focus().insertContent(emoji).run(); setEmojiOpen(false) }} />}
        </div>
        {/* Translator button hidden for now — translateContent() is available */}
        {onDiceClick && (
          <button
            type="button"
            onClick={onDiceClick}
            title="Бросить кубик"
            style={{
              background: diceActive ? 'var(--accent-dim)' : 'none',
              border: 'none', color: diceActive ? 'var(--accent)' : 'var(--text-2)',
              padding: '0.25rem 0.45rem', cursor: 'pointer', borderRadius: '2px',
              lineHeight: 1, display: 'inline-flex', alignItems: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="3"/>
              <circle cx="8" cy="8" r="1.3" fill="currentColor"/>
              <circle cx="16" cy="8" r="1.3" fill="currentColor"/>
              <circle cx="8" cy="16" r="1.3" fill="currentColor"/>
              <circle cx="16" cy="16" r="1.3" fill="currentColor"/>
              <circle cx="12" cy="12" r="1.3" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>

      {/* Music embed panel */}
      {musicOpen && (
        <div style={{
          padding: '0.75rem 0.9rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: '0.08em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
            Вставьте embed-код со Spotify или Яндекс.Музыки
          </span>
          <textarea
            value={embedInput}
            onChange={e => { setEmbedInput(e.target.value); setEmbedError('') }}
            placeholder={'<iframe src="https://open.spotify.com/embed/..." ...></iframe>'}
            rows={3}
            style={{
              fontFamily: 'var(--mono)', fontSize: '0.75rem',
              background: 'var(--bg)', color: 'var(--text)',
              border: embedError ? '1px solid var(--accent)' : '1px solid var(--border)',
              outline: 'none', resize: 'vertical', padding: '0.5rem',
              lineHeight: 1.5, width: '100%',
            }}
            spellCheck={false}
          />
          {embedError && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--accent)' }}>{embedError}</span>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={insertEmbed}
              style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.08em', background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.35rem 0.9rem', cursor: 'pointer' }}
            >
              Вставить
            </button>
            <button type="button" onClick={() => { setMusicOpen(false); setEmbedInput(''); setEmbedError('') }}
              style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '0.35rem 0.9rem', cursor: 'pointer' }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
