// In-memory pub/sub для SSE (single-process MVP)
// Хранится на globalThis чтобы пережить HMR в dev-режиме
type Listener = (data: unknown) => void

const g = globalThis as any
if (!g.__sseListeners) g.__sseListeners = new Map<string, Set<Listener>>()
const listeners: Map<string, Set<Listener>> = g.__sseListeners

export function subscribe(gameId: string, fn: Listener): () => void {
  if (!listeners.has(gameId)) listeners.set(gameId, new Set())
  listeners.get(gameId)!.add(fn)
  return () => listeners.get(gameId)?.delete(fn)
}

export function notifyGame(gameId: string, data: unknown) {
  listeners.get(gameId)?.forEach(fn => fn(data))
}
