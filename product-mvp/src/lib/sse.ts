// In-memory pub/sub для SSE (single-process MVP)
// Хранится на globalThis чтобы пережить HMR в dev-режиме
type Listener = (data: unknown) => void

const g = globalThis as unknown as { __sseListeners?: Map<string, Set<Listener>> }
if (!g.__sseListeners) g.__sseListeners = new Map<string, Set<Listener>>()
const listeners = g.__sseListeners

export function subscribe(gameId: string, fn: Listener): () => void {
  if (!listeners.has(gameId)) listeners.set(gameId, new Set())
  listeners.get(gameId)!.add(fn)
  return () => listeners.get(gameId)?.delete(fn)
}

export function notifyGame(gameId: string, data: unknown) {
  listeners.get(gameId)?.forEach(fn => fn(data))
}

// Connection limit per user
const g2 = globalThis as unknown as { __sseConnections?: Map<string, number> }
if (!g2.__sseConnections) g2.__sseConnections = new Map()
const connections = g2.__sseConnections

const MAX_CONNECTIONS_PER_USER = 5

export function canConnect(userId: string): boolean {
  const count = connections.get(userId) || 0
  return count < MAX_CONNECTIONS_PER_USER
}

export function trackConnect(userId: string): void {
  connections.set(userId, (connections.get(userId) || 0) + 1)
}

export function trackDisconnect(userId: string): void {
  const count = connections.get(userId) || 0
  if (count <= 1) connections.delete(userId)
  else connections.set(userId, count - 1)
}
