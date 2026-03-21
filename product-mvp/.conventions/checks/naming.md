# Naming Conventions

## Files

- **API routes:** `route.ts` in nested directories following Next.js App Router convention
- **Components:** PascalCase — `GameDialogClient.tsx`, `AdminModeration.tsx`
- **Hooks:** camelCase with `use` prefix — `usePublishFlow.ts`, `useGameChat.ts`
- **Tests:** same name as source + `.test.ts` — `publish-consent.test.ts`
- **Lib utilities:** kebab-case — `rate-limit.ts`, `game-utils.ts`
- **Types:** `api.ts` in `src/types/` for shared types

## Variables and functions

- **Code language:** English (variables, functions, comments)
- **UI language:** Russian (via i18n system, never hardcoded in components)
- **Constants:** UPPER_SNAKE_CASE — `MIN_IC_POSTS`, `VIOLATION_THRESHOLD`
- **Types/Interfaces:** PascalCase — `GameStatus`, `UsePublishFlowParams`
- **Boolean props:** `is`/`has` prefix — `isLeft`, `isPreparing`, `hasContent`

## Constants

Single source of truth in `src/lib/constants.ts`:

```ts
export const MIN_IC_POSTS = 20
```

Import from there, never duplicate:
```ts
import { MIN_IC_POSTS } from '@/lib/constants'
```

## Database columns vs TypeScript properties

- DB: snake_case — `session_version`, `created_at`, `left_at`
- TS interfaces matching DB rows: snake_case (matching DB) — `session_version: number`
- TS session/internal: camelCase — `sessionVersion`, `gameStatus`
