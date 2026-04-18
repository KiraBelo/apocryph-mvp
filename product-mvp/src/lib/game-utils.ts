export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const FEED_BG_PALETTE = [
  'rgba(190, 175, 160, 0.10)',
  'rgba(160, 175, 190, 0.10)',
  'rgba(165, 185, 160, 0.10)',
  'rgba(185, 160, 175, 0.10)',
  'rgba(175, 160, 185, 0.10)',
  'rgba(185, 180, 155, 0.10)',
]

export function feedPostBg(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  return FEED_BG_PALETTE[hash % FEED_BG_PALETTE.length]
}

export const NOTE_COLLAPSE_CHARS = 350

export function htmlToText(html: string): string {
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent ?? div.innerText ?? ''
  }
  // Server-side fallback: простая очистка тегов + декодирование базовых entities.
  // Без DOM не можем корректно распарсить HTML, но для текстовых нужд достаточно.
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isSMSOnly(html: string): boolean {
  const rest = html.trim().replace(/<div class="sms-bubble">[\s\S]*?<\/div>/g, '').trim()
  return rest === '' || rest === '<p></p>'
}

export function downloadFile(fileContent: string, filename: string, mime: string) {
  const blob = new Blob([fileContent], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function paginationRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) pages.push('...')
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total - 1) pages.push('...')
  pages.push(total)
  return pages
}
