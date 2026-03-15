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
