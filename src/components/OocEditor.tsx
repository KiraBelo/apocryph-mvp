'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import { Mark, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

// Custom mark for spoiler text
const SpoilerMark = Mark.create({
  name: 'spoiler',
  parseHTML() {
    return [{ tag: 'span.ooc-spoiler' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'ooc-spoiler' }), 0]
  },
})

interface Props {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function OocEditor({ content, onChange, placeholder = 'Напиши сообщение...' }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, horizontalRule: false, codeBlock: false }),
      SpoilerMark,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        style: `min-height: 80px; padding: 0.65rem 0.85rem; outline: none; font-family: var(--mono); font-size: 0.88rem; line-height: 1.65;`,
        'data-placeholder': placeholder,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    if (content !== editor.getHTML()) editor.commands.setContent(content)
  }, [])

  if (!editor) return null

  const btn = (active: boolean, onClick: () => void, label: React.ReactNode, title?: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        fontFamily: 'var(--mono)', fontSize: '0.72rem', fontWeight: active ? 700 : 400,
        background: active ? 'var(--bg-2)' : 'none',
        border: 'none', color: active ? 'var(--text)' : 'var(--text-2)',
        padding: '0.2rem 0.4rem', cursor: 'pointer', borderRadius: '2px', lineHeight: 1,
      }}
    >
      {label}
    </button>
  )

  const sep = () => (
    <span style={{ width: '1px', background: 'var(--border)', margin: '0 0.15rem', alignSelf: 'stretch' }} />
  )

  const isSpoilerActive = editor.isActive('spoiler')

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--bg-3)' }}>
      {/* Minimal toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.1rem',
        padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-3)',
      }}>
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <strong>B</strong>, 'Жирный')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <em>I</em>, 'Курсив')}
        {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(),
          <span style={{ textDecoration: 'line-through' }}>S</span>, 'Зачёркнутый')}
        {sep()}
        {btn(isSpoilerActive, () => editor.chain().focus().toggleMark('spoiler').run(),
          <span style={{
            background: isSpoilerActive ? 'var(--text)' : 'var(--border)',
            color: isSpoilerActive ? 'var(--text)' : 'var(--text-2)',
            padding: '0 3px', borderRadius: '2px', fontSize: '0.65rem', letterSpacing: '0.05em',
          }}>СПОЙЛЕР</span>,
          'Скрыть текст спойлером'
        )}
        {sep()}
        {btn(false, () => editor.chain().focus().unsetAllMarks().run(), '✕', 'Очистить форматирование')}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
