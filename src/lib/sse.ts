// In-memory pub/sub для SSE (single-process MVP)
type Listener = (data: unknown) => void

const listeners = new Map<string, Set<Listener>>()

export function subscribe(gameId: string, fn: Listener): () => void {
  if (!listeners.has(gameId)) listeners.set(gameId, new Set())
  listeners.get(gameId)!.add(fn)
  return () => listeners.get(gameId)?.delete(fn)
}

export function notifyGame(gameId: string, data: unknown) {
  listeners.get(gameId)?.forEach(fn => fn(data))
}
