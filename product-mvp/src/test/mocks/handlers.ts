import { http } from 'msw'

// Default handlers. Empty — tests add their own via server.use() per-test.
// Shared handlers that should apply to every client test can go here.
export const handlers: ReturnType<typeof http.get>[] = []
