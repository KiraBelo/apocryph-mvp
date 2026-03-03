'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import { useState, useEffect } from 'react'

const FONTS = [
  { label: 'EB Garamond', value: 'EB Garamond, Georgia, serif' },
  { label: 'Cormorant', value: 'Cormorant Garamond, Georgia, serif' },
  { label: 'Courier Prime', value: 'Courier Prime, monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'По умолчанию', value: '' },
]

const COLORS = ['#1c1813', '#8b1a1a', '#1a4a8b', '#1a7a3a', '#5a4e40', '#7c1a8b', '#8b6a1a']
const HIGHLIGHTS = ['#fff3cd', '#fce4e4', '#e4f4e4', '#e4eef4', '#f4e4f4', '#e4f4f4']

interface Props {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

export default function RichEditor({ content, onChange, placeholder = 'Начни писать...', minHeight = '180px' }: Props) {
  const [htmlMode, setHtmlMode] = useState(false)
  const [rawHtml, setRawHtml] = useState(content)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontFamily,
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

  function applyHtml() {
    editor?.commands.setContent(rawHtml)
    setHtmlMode(false)
    onChange(rawHtml)
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
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <strong>B</strong>, 'Жирный')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <em>I</em>, 'Курсив')}
        {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), <span style={{ textDecoration: 'line-through' }}>S</span>, 'Зачёркнутый')}

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
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
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

        {/* Clear + HTML mode */}
        {btn(false, () => editor.chain().focus().unsetAllMarks().clearNodes().run(), '✕', 'Очистить форматирование')}
        {btn(htmlMode, () => {
          if (!htmlMode) setRawHtml(editor.getHTML())
          setHtmlMode(m => !m)
        }, '‹/›', 'HTML-режим')}
      </div>

      {/* Editor or HTML textarea */}
      {htmlMode ? (
        <div style={{ padding: '0.75rem' }}>
          <textarea
            value={rawHtml}
            onChange={e => setRawHtml(e.target.value)}
            style={{
              width: '100%', minHeight, fontFamily: 'var(--mono)', fontSize: '0.82rem',
              background: 'var(--bg)', color: 'var(--text)', border: 'none', outline: 'none', resize: 'vertical',
              lineHeight: 1.6, padding: '0.5rem',
            }}
            spellCheck={false}
          />
          <button type="button" onClick={applyHtml}
            style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.08em', background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.35rem 0.9rem', cursor: 'pointer', marginTop: '0.5rem' }}
          >
            Применить HTML
          </button>
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  )
}
