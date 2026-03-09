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
      className={`font-mono text-[0.72rem] border-none p-[0.2rem_0.4rem] cursor-pointer rounded-[2px] leading-none
        ${active ? 'font-bold bg-surface-2 text-ink' : 'font-normal bg-transparent text-ink-2'}`}
    >
      {label}
    </button>
  )

  const sep = () => (
    <span className="w-px bg-edge mx-[0.15rem] self-stretch" />
  )

  const isSpoilerActive = editor.isActive('spoiler')

  return (
    <div className="border border-edge bg-surface-3">
      {/* Minimal toolbar */}
      <div className="flex items-center gap-[0.1rem] p-[0.3rem_0.5rem] border-b border-edge bg-surface-3">
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <strong>B</strong>, 'Жирный')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <em>I</em>, 'Курсив')}
        {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(),
          <span className="line-through">S</span>, 'Зачёркнутый')}
        {sep()}
        {btn(isSpoilerActive, () => editor.chain().focus().toggleMark('spoiler').run(),
          <span
            className="p-[0_3px] rounded-[2px] text-[0.65rem] tracking-[0.05em]"
            style={{
              background: isSpoilerActive ? 'var(--text)' : 'var(--border)',
              color: isSpoilerActive ? 'var(--text)' : 'var(--text-2)',
            }}
          >СПОЙЛЕР</span>,
          'Скрыть текст спойлером'
        )}
        {sep()}
        {btn(false, () => editor.chain().focus().unsetAllMarks().run(), '✕', 'Очистить форматирование')}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
