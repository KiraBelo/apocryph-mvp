'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import { Node, Mark, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import Underline from '@tiptap/extension-underline'
import { useState, useEffect, useRef } from 'react'
import { FONT_GROUPS } from '@/lib/fonts'
import { useT } from './SettingsContext'

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

// Custom Tiptap node for music embeds — uses a NodeView to prevent iframe remounts
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
  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('div')
      wrapper.style.position = 'relative'
      wrapper.contentEditable = 'false'

      const iframe = document.createElement('iframe')
      const attrs = node.attrs
      if (attrs.src) iframe.src = attrs.src
      iframe.width = attrs.width || '100%'
      iframe.height = attrs.height || '152'
      iframe.frameBorder = attrs.frameborder || '0'
      if (attrs.allow) iframe.allow = attrs.allow
      if (attrs.allowtransparency) iframe.setAttribute('allowtransparency', attrs.allowtransparency)
      iframe.style.border = 'none'
      iframe.style.display = 'block'

      wrapper.appendChild(iframe)

      return {
        dom: wrapper,
        ignoreMutation: () => true,
      }
    }
  },
})

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

const EMOJI_LIST = [
  '😊','😂','🥺','😍','😭','😏','😈','🤔','🙄','😳','🥰','😤',
  '🤣','😅','😎','🥲','😢','😡','🤗','😴','🤭','😱','🫠','🫣',
  '❤️','🖤','💔','💜','🔥','✨','💫','⭐','🌙','🌹','🗡️','⚔️',
  '🎭','🎪','👑','💀','🦊','🐺','🐉','🦇','🌑','🌕','🕯️','📖',
  '👀','🫶','🤝','✍️','💭','💬','🎵','🎶','💐','🥀','🍷','☕',
]

function EmojiDropdown({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className="absolute top-[calc(100%+4px)] right-0 z-200 bg-surface border border-edge shadow-[0_4px_16px_rgba(0,0,0,0.15)] p-2 w-[320px] max-h-[260px] overflow-y-auto grid grid-cols-8 gap-[2px]">
      {EMOJI_LIST.map(e => (
        <button key={e} type="button" onClick={() => onSelect(e)}
          className="bg-transparent border-none text-[1.2rem] cursor-pointer p-[0.2rem] rounded-[4px] leading-none hover:bg-surface-3"
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

export default function RichEditor({ content, onChange, placeholder, minHeight = '180px', onDiceClick, diceActive }: Props) {
  const t = useT()
  const ph = placeholder || (t('editor.placeholder') as string)
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
      SpoilerMark,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        style: `min-height: ${minHeight}; padding: 1rem; outline: none;`,
        'data-placeholder': ph,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, content])

  // Close emoji picker on click outside
  useEffect(() => {
    if (!emojiOpen) return
    function close(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as globalThis.Node)) setEmojiOpen(false)
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
      setEmbedError(t('editor.embedNoIframe') as string)
      return
    }

    const src = iframe.getAttribute('src') ?? ''
    const allowed =
      src.startsWith('https://open.spotify.com/embed/') ||
      src.startsWith('https://music.yandex.ru/iframe/')

    if (!allowed) {
      setEmbedError(t('editor.embedNotAllowed') as string)
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
      className={`font-mono text-[0.75rem] border-none p-[0.25rem_0.45rem] cursor-pointer rounded-[2px] leading-none
        ${active ? 'font-bold bg-accent-dim text-accent' : 'font-normal bg-transparent text-ink-2'}`}
    >
      {children}
    </button>
  )

  const sep = () => (
    <span className="w-px bg-edge mx-[0.2rem] self-stretch" />
  )

  return (
    <div className="border border-edge bg-surface-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-[0.15rem] p-[0.45rem_0.65rem] border-b border-edge bg-surface-3">
        {/* Text style */}
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <strong>B</strong>, t('editor.boldCtrl') as string)}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <em>I</em>, t('editor.italicCtrl') as string)}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <span className="underline">U</span>, t('editor.underlineCtrl') as string)}
        {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), <span className="line-through">S</span>, t('editor.strikethroughCtrl') as string)}
        {btn(editor.isActive('spoiler'), () => editor.chain().focus().toggleMark('spoiler').run(),
          <span
            className="p-[0_3px] rounded-[2px] text-[0.6rem] tracking-[0.05em]"
            style={{
              background: editor.isActive('spoiler') ? 'var(--text)' : 'var(--border)',
              color: editor.isActive('spoiler') ? 'var(--text)' : 'var(--text-2)',
            }}
          >SP</span>, t('editor.spoiler') as string)}

        {sep()}

        {/* Headings */}
        {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1')}
        {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2')}
        {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3')}

        {sep()}

        {/* Lists */}
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), '• —', t('editor.list') as string)}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1.', t('editor.orderedList') as string)}
        {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), '❝', t('editor.quote') as string)}

        {sep()}

        {/* Alignment */}
        {btn(editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), '⇐', t('editor.alignLeft') as string)}
        {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), '⇔', t('editor.alignCenter') as string)}
        {btn(editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), '⇒', t('editor.alignRight') as string)}
        {btn(editor.isActive({ textAlign: 'justify' }), () => editor.chain().focus().setTextAlign('justify').run(), '≡', t('editor.alignJustify') as string)}

        {sep()}

        {/* Font family */}
        <select
          onChange={e => {
            if (e.target.value) editor.chain().focus().setFontFamily(e.target.value).run()
            else editor.chain().focus().unsetFontFamily().run()
          }}
          className="select-base text-[0.68rem] p-[0.2rem_0.4rem] !w-auto"
          title={t('editor.font') as string}
        >
          <option value="">{t('editor.fontDefault') as string}</option>
          {FONT_GROUPS.map((g, gi) => (
            <optgroup key={gi} label={t(`editor.${g.key}`) as string}>
              {g.fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </optgroup>
          ))}
        </select>

        {sep()}

        {/* Text color */}
        <span className="font-mono text-[0.62rem] text-ink-2 mr-[0.15rem]">A</span>
        {COLORS.map(c => (
          <button
            key={c} type="button"
            onClick={() => editor.chain().focus().setColor(c).run()}
            className="w-[14px] h-[14px] cursor-pointer rounded-[2px]"
            style={{ background: c, border: editor.isActive('textStyle', { color: c }) ? '2px solid var(--text)' : '1px solid var(--border)' }}
            title={c}
          />
        ))}

        {sep()}

        {/* Highlight */}
        <span className="font-mono text-[0.62rem] text-ink-2 mr-[0.15rem]">HL</span>
        {HIGHLIGHTS.map(c => (
          <button
            key={c} type="button"
            onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
            className="w-[14px] h-[14px] border border-edge cursor-pointer rounded-[2px]"
            style={{ background: c }}
            title={`${t('editor.highlight') as string}: ${c}`}
          />
        ))}

        {sep()}

        {/* Horizontal rule (scene separator) */}
        {btn(false, () => editor.chain().focus().setHorizontalRule().run(), '―', t('editor.sceneSeparator') as string)}

        {sep()}

        {/* Clear + Music embed + SMS + Emoji */}
        {btn(false, () => editor.chain().focus().unsetAllMarks().clearNodes().run(), '✕', t('editor.clearFormatting') as string)}
        {btn(musicOpen, () => { setMusicOpen(m => !m); setEmbedError('') }, <span className="text-[1rem] leading-none">♫</span>, t('editor.embedMusic') as string)}
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
            editor.commands.focus('end')
          } else {
            // Build timestamp
            const now = new Date()
            const hh = String(now.getHours()).padStart(2, '0')
            const mm = String(now.getMinutes()).padStart(2, '0')
            const metaHtml = `<p class="sms-meta">${hh}:${mm} ✓✓</p>`
            // Wrap all content in smsBlock with timestamp at bottom
            editor.chain().focus().selectAll().wrapIn('smsBlock').run()
            const html = editor.getHTML()
            // Insert meta right before closing </div> of sms-bubble
            const patched = html.replace(/<\/div>(?![\s\S]*<\/div>)/, `${metaHtml}</div>`)
            editor.commands.setContent(patched)
            editor.commands.focus('end')
          }
        }, <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="0.5" fill="currentColor"/><circle cx="12" cy="10" r="0.5" fill="currentColor"/><circle cx="15" cy="10" r="0.5" fill="currentColor"/></svg>, t('editor.smsBubble') as string)}
        <div ref={emojiRef} className="relative inline-flex">
          {btn(emojiOpen, () => setEmojiOpen(o => !o), <span className="text-[0.9rem] leading-none">☺</span>, t('editor.emoji') as string)}
          {emojiOpen && <EmojiDropdown onSelect={(emoji: string) => { editor.chain().focus().insertContent(emoji).run(); setEmojiOpen(false) }} />}
        </div>
        {/* Translator button hidden for now — translateContent() is available */}
        {onDiceClick && (
          <button
            type="button"
            onClick={onDiceClick}
            title={t('editor.rollDice') as string}
            className={`border-none p-[0.25rem_0.45rem] cursor-pointer rounded-[2px] leading-none inline-flex items-center
              ${diceActive ? 'bg-accent-dim text-accent' : 'bg-transparent text-ink-2'}`}
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
        <div className="p-[0.75rem_0.9rem] border-b border-edge bg-surface-3 flex flex-col gap-2">
          <span className="section-label">
            {t('editor.embedPrompt') as string}
          </span>
          <textarea
            value={embedInput}
            onChange={e => { setEmbedInput(e.target.value); setEmbedError('') }}
            placeholder={'<iframe src="https://open.spotify.com/embed/..." ...></iframe>'}
            rows={3}
            className="input-base font-mono text-[0.75rem] resize-y leading-normal w-full"
            style={{ borderColor: embedError ? 'var(--accent)' : undefined }}
            spellCheck={false}
          />
          {embedError && (
            <span className="font-mono text-[0.65rem] text-accent">{embedError}</span>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={insertEmbed}
              className="btn-primary text-[0.7rem] tracking-[0.08em] py-[0.35rem] px-[0.9rem]"
            >
              {t('editor.embedInsert') as string}
            </button>
            <button type="button" onClick={() => { setMusicOpen(false); setEmbedInput(''); setEmbedError('') }}
              className="btn-ghost text-[0.7rem] tracking-[0.08em] py-[0.35rem] px-[0.9rem]"
            >
              {t('editor.embedCancel') as string}
            </button>
          </div>
        </div>
      )}

      <div className="max-h-[50vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
