# Import Conventions

## Order

1. External packages (`next/server`, `react`, `bcryptjs`)
2. Internal lib (`@/lib/db`, `@/lib/session`, `@/lib/constants`)
3. Types (`@/types/api` — use `import type` for type-only imports)
4. Components (`@/components/...`)
5. Relative imports (`./types`, `./utils`)

## Type imports

Always use `import type` for type-only imports:

```ts
import type { GameStatus } from '@/types/api'
import type { Message, GameDialogProps } from './game/types'
```

## Path aliases

Use `@/` alias, never relative paths crossing directories:

```ts
// GOOD
import { MIN_IC_POSTS } from '@/lib/constants'
import type { GameStatus } from '@/types/api'

// BAD
import { MIN_IC_POSTS } from '../../../lib/constants'
```

Relative imports are fine within the same directory:
```ts
import { tabBtnCls } from './utils'
import type { Participant } from './types'
```

## Mock imports in tests

Mocks must be declared BEFORE the imports they affect:

```ts
// 1. vi.mock() declarations (hoisted by vitest, but keep them first for clarity)
vi.mock('@/lib/db', () => ({ query: vi.fn(), queryOne: vi.fn() }))
vi.mock('@/lib/session', () => ({
  requireUser: vi.fn(),
  requireMod: vi.fn(),    // include ALL exports the tested route uses
  getUser: vi.fn(),
  getSession: vi.fn(),
}))

// 2. Actual imports
import { requireUser } from '@/lib/session'

// 3. Typed mock references
const mockRequireUser = vi.mocked(requireUser)
```

## No re-export shims

When moving a constant/type to a new location, update all consumers directly.
Do not leave re-export shims in the old location:

```ts
// BAD — backward-compat shim in old file
export { MIN_IC_POSTS } from '@/lib/constants'

// GOOD — just remove from old file, update all imports
```
