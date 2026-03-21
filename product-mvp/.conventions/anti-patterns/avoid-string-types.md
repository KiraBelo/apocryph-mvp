# Anti-pattern: Using `string` for known value sets

## Why banned

- `string` allows any value, including typos and invalid states
- No autocomplete in IDE for valid values
- Bugs from invalid values only surface at runtime, not compile time
- The `'finished'` status bug: tests referenced a deleted status for months because it was typed as `string`

## Do this instead

Use union types from `src/types/api.ts`:

```tsx
// BAD
gameStatus: string
setGameStatus: (status: string) => void

// GOOD
import type { GameStatus } from '@/types/api'
gameStatus: GameStatus                          // 'active' | 'preparing' | 'moderation' | 'published'
setGameStatus: (status: GameStatus) => void
```

### Available union types (src/types/api.ts)

```ts
export type GameStatus = 'active' | 'preparing' | 'moderation' | 'published'
export type RequestStatus = 'draft' | 'active' | 'inactive'
export type MessageType = 'ic' | 'ooc' | 'dice'
export type ModerationStatus = 'visible' | 'auto_hidden' | 'hidden' | 'resolved'
export type UserRole = 'user' | 'moderator' | 'admin'
export type PublishChoice = 'publish_as_is' | 'edit_first' | 'decline'
export type BannerPref = 'own' | 'partner' | 'none'
```

### At system boundaries (SSE, fetch responses)

Use `as GameStatus` narrowing cast — this is acceptable at data boundaries:

```tsx
// SSE event data
setGameStatus(data.status as GameStatus)

// DB data via props
const [gameStatus, setGameStatus] = useState<GameStatus>((game.status as GameStatus) || 'active')
```

### Propagate through the full chain

Don't stop at one file. If `GameDialogClient` uses `GameStatus`, then `TopBar` and `StatusChip` that receive it as a prop should also use `GameStatus`, not `string`.

## Discovered during

Task #11 (test fix — 'finished' status), Task #13 (typing fix — full chain propagation).
