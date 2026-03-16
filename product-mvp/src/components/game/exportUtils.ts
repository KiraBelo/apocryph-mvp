import { escapeHtml, htmlToText, downloadFile } from '@/lib/game-utils'
import type { Message, NoteEntry } from './types'

export function exportTxt(messages: Message[], notes: NoteEntry[], requestTitle: string | null, t: (key: string) => unknown) {
  const title = requestTitle ?? t('game.historyFallback') as string
  const lines = [`${title}\n${'='.repeat(title.length)}\n`]
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleString('ru')
    lines.push(`[${date}] ${msg.nickname}${msg.edited_at ? ` (${t('game.editedShort') as string})` : ''}`)
    lines.push(htmlToText(msg.content))
    lines.push('')
  }
  downloadFile(lines.join('\n'), `${title}.txt`, 'text/plain;charset=utf-8')
}

export function exportHtml(messages: Message[], notes: NoteEntry[], requestTitle: string | null, t: (key: string) => unknown) {
  const title = requestTitle ?? t('game.historyFallback') as string
  const rows = messages.map(msg => {
    const date = new Date(msg.created_at).toLocaleString('ru')
    return `<div class="msg">
  <div class="meta">${escapeHtml(msg.nickname)}${msg.edited_at ? ` <span class="edited">(${t('game.editedShort') as string})</span>` : ''} · <span class="date">${date}</span></div>
  <div class="body">${msg.content}</div>
</div>`
  }).join('\n')
  const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 3rem auto; padding: 0 1.5rem; color: #1c1813; background: #f7f3eb; line-height: 1.7; }
  h1 { font-size: 2rem; font-style: italic; font-weight: 300; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 2rem; }
  .msg { margin-bottom: 2rem; }
  .meta { font-family: monospace; font-size: 0.75rem; letter-spacing: 0.05em; color: #666; margin-bottom: 0.4rem; }
  .body { background: #fff; border: 1px solid #ddd; padding: 1rem 1.25rem; }
  p { margin: 0 0 0.75em; } p:last-child { margin-bottom: 0; }
</style></head><body><h1>${escapeHtml(title)}</h1>${rows}</body></html>`
  downloadFile(html, `${title}.html`, 'text/html;charset=utf-8')
}

export function exportMd(messages: Message[], notes: NoteEntry[], requestTitle: string | null, t: (key: string) => unknown) {
  const title = requestTitle ?? t('game.historyFallback') as string
  const lines = [`# ${title}\n`]
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleString('ru')
    lines.push(`### ${msg.nickname}${msg.edited_at ? ` *(${t('game.editedShort') as string})*` : ''} — ${date}\n`)
    lines.push(htmlToText(msg.content))
    lines.push('\n---\n')
  }
  downloadFile(lines.join('\n'), `${title}.md`, 'text/markdown;charset=utf-8')
}

export function exportPdf(messages: Message[], notes: NoteEntry[], requestTitle: string | null, t: (key: string) => unknown) {
  const title = requestTitle ?? t('game.historyFallback') as string
  const rows = messages.map(msg => {
    const date = new Date(msg.created_at).toLocaleString('ru')
    return `<div class="msg">
  <div class="meta">${escapeHtml(msg.nickname)}${msg.edited_at ? ` <span class="edited">(${t('game.editedShort') as string})</span>` : ''} · <span class="date">${date}</span></div>
  <div class="body">${msg.content}</div>
</div>`
  }).join('\n')
  const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 3rem auto; padding: 0 1.5rem; color: #1c1813; background: #fff; line-height: 1.7; }
  h1 { font-size: 2rem; font-style: italic; font-weight: 300; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 2rem; }
  .msg { margin-bottom: 2rem; }
  .meta { font-family: monospace; font-size: 0.75rem; letter-spacing: 0.05em; color: #666; margin-bottom: 0.4rem; }
  .body { padding: 0.5rem 0; }
  p { margin: 0 0 0.75em; } p:last-child { margin-bottom: 0; }
  @media print { body { margin: 0; } }
</style></head><body><h1>${escapeHtml(title)}</h1>${rows}</body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank')
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print()
      URL.revokeObjectURL(url)
    }
  }
}

export function exportNotesTxt(messages: Message[], notes: NoteEntry[], requestTitle: string | null, t: (key: string) => unknown) {
  const title = `${t('game.notesFallback') as string} — ${requestTitle ?? t('game.gameFallback') as string}`
  const lines = notes.map(n => {
    const date = new Date(n.created_at).toLocaleString('ru')
    return `[${date}]\n${htmlToText(n.content)}`
  })
  downloadFile(lines.join('\n\n---\n\n'), `${title}.txt`, 'text/plain;charset=utf-8')
}

export function exportNotesHtml(messages: Message[], notes: NoteEntry[], requestTitle: string | null, t: (key: string) => unknown) {
  const title = `${t('game.notesFallback') as string} — ${requestTitle ?? t('game.gameFallback') as string}`
  const entries = notes.map(n => {
    const date = new Date(n.created_at).toLocaleString('ru')
    return `<div class="note"><div class="meta">${date}</div><div class="body">${n.content}</div></div>`
  }).join('\n')
  const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 3rem auto; padding: 0 1.5rem; color: #1c1813; background: #f7f3eb; line-height: 1.7; }
  h1 { font-size: 2rem; font-style: italic; font-weight: 300; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 2rem; }
  .note { margin-bottom: 2rem; border: 1px solid #ddd; }
  .meta { font-family: monospace; font-size: 0.7rem; color: #888; padding: 0.4rem 1rem; border-bottom: 1px solid #eee; }
  .body { padding: 0.75rem 1rem; } blockquote { border-left: 3px solid #8b1a1a; padding-left: 1em; color: #5a4e40; margin: 0.75em 0; }
  p { margin: 0 0 0.75em; }
</style></head><body><h1>${title}</h1>${entries}</body></html>`
  downloadFile(html, `${title}.html`, 'text/html;charset=utf-8')
}
