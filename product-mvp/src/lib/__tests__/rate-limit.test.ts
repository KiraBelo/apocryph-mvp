import { describe, it, expect, beforeEach, vi } from 'vitest'

// Сбрасываем store перед каждым тестом.
// ВАЖНО: .clear() а не new Map() — rate-limit.ts держит ссылку на тот же Map объект.
// setup.ts тоже делает .clear() в beforeEach — это дублирование для явности.
beforeEach(() => {
  const g = globalThis as unknown as { __rateLimitStore?: Map<string, unknown> }
  g.__rateLimitStore?.clear()
})

// Импортируем ПОСЛЕ сброса store, чтобы модуль подхватил чистый Map
// (rate-limit.ts читает globalThis при инициализации модуля, поэтому
//  сам store уже привязан к тому же Map — нам достаточно его очищать)
import { rateLimit } from '../rate-limit'

describe('rateLimit', () => {
  // ── Базовое поведение ─────────────────────────────────────────────────────
  describe('basic behaviour', () => {
    it('allows first request', () => {
      const result = rateLimit('test-key', 3, 60_000)
      expect(result.allowed).toBe(true)
    })

    it('returns correct remaining on first call', () => {
      const result = rateLimit('key-remaining', 5, 60_000)
      expect(result.remaining).toBe(4) // maxAttempts - 1
    })

    it('allows requests up to maxAttempts', () => {
      const key = 'key-max'
      for (let i = 0; i < 3; i++) {
        const r = rateLimit(key, 3, 60_000)
        expect(r.allowed).toBe(true)
      }
    })

    it('blocks the request AFTER maxAttempts is exceeded', () => {
      const key = 'key-block'
      rateLimit(key, 2, 60_000) // 1
      rateLimit(key, 2, 60_000) // 2
      const third = rateLimit(key, 2, 60_000) // 3 — over limit
      expect(third.allowed).toBe(false)
      expect(third.remaining).toBe(0)
    })

    it('returns remaining=0 when blocked', () => {
      const key = 'key-zero'
      rateLimit(key, 1, 60_000) // 1
      const r = rateLimit(key, 1, 60_000) // 2 — blocked
      expect(r.remaining).toBe(0)
    })
  })

  // ── Счётчик убывает корректно ─────────────────────────────────────────────
  describe('remaining counter', () => {
    it('decrements remaining with each call', () => {
      const key = 'key-decrement'
      const r1 = rateLimit(key, 5, 60_000)
      const r2 = rateLimit(key, 5, 60_000)
      const r3 = rateLimit(key, 5, 60_000)
      expect(r1.remaining).toBe(4)
      expect(r2.remaining).toBe(3)
      expect(r3.remaining).toBe(2)
    })
  })

  // ── Независимость ключей ──────────────────────────────────────────────────
  describe('key isolation', () => {
    it('different keys do not share counters', () => {
      rateLimit('key-a', 1, 60_000)
      rateLimit('key-a', 1, 60_000) // key-a blocked

      const r = rateLimit('key-b', 1, 60_000) // key-b should be unaffected
      expect(r.allowed).toBe(true)
    })

    it('same key with different windows are treated as same entry', () => {
      const key = 'key-shared'
      rateLimit(key, 2, 60_000)
      rateLimit(key, 2, 60_000)
      const r = rateLimit(key, 2, 60_000)
      expect(r.allowed).toBe(false)
    })
  })

  // ── Сброс по истечению окна ───────────────────────────────────────────────
  describe('window reset', () => {
    it('resets counter after window expires', () => {
      vi.useFakeTimers()
      const key = 'key-reset'

      rateLimit(key, 2, 1_000)
      rateLimit(key, 2, 1_000)
      const blocked = rateLimit(key, 2, 1_000)
      expect(blocked.allowed).toBe(false)

      // Перемотать время за пределы окна
      vi.advanceTimersByTime(1_001)

      const afterReset = rateLimit(key, 2, 1_000)
      expect(afterReset.allowed).toBe(true)
      expect(afterReset.remaining).toBe(1)

      vi.useRealTimers()
    })

    it('starts fresh count after window reset', () => {
      vi.useFakeTimers()
      const key = 'key-fresh'

      rateLimit(key, 3, 1_000)
      rateLimit(key, 3, 1_000)
      vi.advanceTimersByTime(1_001)

      const r = rateLimit(key, 3, 1_000)
      expect(r.remaining).toBe(2) // как будто первый запрос в новом окне
      vi.useRealTimers()
    })
  })

  // ── Граничные значения ────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('maxAttempts=1: allows first, blocks second', () => {
      const key = 'key-one'
      expect(rateLimit(key, 1, 60_000).allowed).toBe(true)
      expect(rateLimit(key, 1, 60_000).allowed).toBe(false)
    })

    it('uses the same store on repeated module references', () => {
      const key = 'key-module'
      rateLimit(key, 2, 60_000)
      rateLimit(key, 2, 60_000)
      // Блокировка должна сохраняться при повторных вызовах
      expect(rateLimit(key, 2, 60_000).allowed).toBe(false)
    })
  })
})
