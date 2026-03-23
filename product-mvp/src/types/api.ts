export type GameStatus = 'active' | 'preparing' | 'moderation' | 'published'
export type RequestStatus = 'draft' | 'active' | 'inactive'
export type MessageType = 'ic' | 'ooc' | 'dice'
export type ModerationStatus = 'visible' | 'auto_hidden' | 'hidden' | 'resolved'
export type UserRole = 'user' | 'moderator' | 'admin'
export type PublishChoice = 'publish_as_is' | 'edit_first' | 'decline'
export type BannerPref = 'own' | 'partner' | 'none'

// ── Pagination ──────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  totalPages: number
}

// ── Requests ────────────────────────────────────
export interface RequestCard {
  id: string
  title: string
  body: string
  type: 'duo' | 'multiplayer'
  content_level: 'none' | 'rare' | 'often' | 'core' | 'flexible'
  fandom_type: 'fandom' | 'original'
  pairing: 'sl' | 'fm' | 'gt' | 'any' | 'multi' | 'other'
  language: 'ru' | 'en'
  tags: string[]
  status: RequestStatus
  is_public: boolean
  author_id: string
  created_at: string
  updated_at: string
}

// ── API Errors ──────────────────────────────────
export type ApiErrorCode =
  | 'unauthorized' | 'banned' | 'forbidden' | 'notFound' | 'serverError'
  | 'fillRequired' | 'tooLong' | 'requestLimitReached' | 'requestCooldown'
  | 'duplicateRequest' | 'alreadyResponded' | 'cannotRespondOwn'
