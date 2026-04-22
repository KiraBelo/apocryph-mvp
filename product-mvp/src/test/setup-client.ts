import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './mocks/server'
import './mocks/next'

// Fixed time zone and system time for deterministic tests.
process.env.TZ = 'UTC'

// Mock EventSource for SSE-based client code.
class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  readyState = 1 // OPEN
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onopen: ((event: Event) => void) | null = null
  private listeners: Record<string, ((event: MessageEvent) => void)[]> = {}

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, handler: (event: MessageEvent) => void) {
    ;(this.listeners[type] ??= []).push(handler)
  }

  removeEventListener(type: string, handler: (event: MessageEvent) => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((h) => h !== handler)
  }

  close() {
    this.readyState = 2 // CLOSED
  }

  // Test helpers — call from tests to simulate server events.
  dispatchMessage(data: unknown) {
    const event = new MessageEvent('message', { data: JSON.stringify(data) })
    this.onmessage?.(event)
    this.listeners.message?.forEach((h) => h(event))
  }

  dispatchTyped(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    this.listeners[type]?.forEach((h) => h(event))
  }

  dispatchError() {
    this.onerror?.(new Event('error'))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsdom has no EventSource, polyfilling global requires casting through unknown
;(globalThis as unknown as { EventSource: typeof EventSource }).EventSource =
  MockEventSource as unknown as typeof EventSource

// Start MSW before all tests, reset handlers between tests, close after all.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  MockEventSource.instances = []
  vi.clearAllMocks()
})
afterAll(() => server.close())

export { MockEventSource }
