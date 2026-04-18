import type { GameStatus, ModerationStatus } from '@/types/api'

export interface Message {
  id: string; participant_id: string; content: string; created_at: string;
  edited_at: string | null; nickname: string; avatar_url: string | null; user_id: string;
  type: 'ic' | 'ooc' | 'dice'
}

export interface Participant {
  id: string; user_id: string; nickname: string; avatar_url: string | null; banner_url: string | null; banner_pref: 'own' | 'partner' | 'none'; left_at: string | null
}

export interface NoteEntry {
  id: number; title: string; content: string; created_at: string; updated_at: string | null
}

export interface SearchResult {
  id: string; snippet: string; created_at: string; nickname: string; page: number
}

export interface GameDialogProps {
  gameId: string
  game: { id: string; request_id: string | null; banner_url: string | null; ooc_enabled: boolean; moderation_status?: ModerationStatus; status?: GameStatus; published_at?: string | null }
  initialMessages: Message[]
  initialPage: number
  totalPages: number
  participants: Participant[]
  me: Participant
  userId: string
  requestTitle: string | null
}

