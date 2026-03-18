import { describe, it, expect, vi, beforeEach } from 'vitest'

// Мокаем lib/db — auth.ts зависит от него
vi.mock('../db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}))

import { query, queryOne } from '../db'
import { createUser, verifyUser, getUserById } from '../auth'

const mockQuery = vi.mocked(query)
const mockQueryOne = vi.mocked(queryOne)

beforeEach(() => {
  vi.clearAllMocks()
})

// Фиктивный хеш bcrypt для тестов (не пересчитываем реальный bcrypt для скорости)
// Используем реальный bcrypt только там где нужна проверка поведения
const REAL_PASSWORD = 'password123'

describe('createUser', () => {
  it('inserts user with lowercased trimmed email', async () => {
    const fakeUser = {
      id: 'uuid-1',
      email: 'user@example.com',
      password_hash: '$2b$10$hashhashhashhashhashhash',
      created_at: '2026-01-01T00:00:00Z',
    }
    mockQuery.mockResolvedValueOnce([fakeUser])

    await createUser('  User@EXAMPLE.COM  ', REAL_PASSWORD)

    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      expect.arrayContaining(['user@example.com', expect.any(String)])
    )
  })

  it('returns created user', async () => {
    const fakeUser = {
      id: 'uuid-2',
      email: 'new@example.com',
      password_hash: 'hash',
      created_at: '2026-01-01T00:00:00Z',
    }
    mockQuery.mockResolvedValueOnce([fakeUser])

    const result = await createUser('new@example.com', REAL_PASSWORD)
    expect(result).toEqual(fakeUser)
  })

  it('hashes the password (stores hash, not plaintext)', async () => {
    const fakeUser = { id: 'uuid-3', email: 'a@b.com', password_hash: '', created_at: '' }
    mockQuery.mockResolvedValueOnce([fakeUser])

    await createUser('a@b.com', REAL_PASSWORD)

    const callArgs = mockQuery.mock.calls[0][1] as string[]
    const storedHash = callArgs[1]
    // Хеш bcrypt всегда начинается с $2b$ или $2a$
    expect(storedHash).toMatch(/^\$2[ab]\$/)
    // Хеш не равен оригинальному паролю
    expect(storedHash).not.toBe(REAL_PASSWORD)
  })

  it('propagates DB error (e.g. duplicate email constraint)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'))
    await expect(createUser('dup@example.com', REAL_PASSWORD)).rejects.toThrow('duplicate key')
  })
})

describe('verifyUser', () => {
  it('returns null when user not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    const result = await verifyUser('notfound@example.com', 'any')
    expect(result).toBeNull()
  })

  it('returns null when password is wrong', async () => {
    // Генерируем реальный хеш для проверки compare
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash('correctpassword', 10)

    mockQueryOne.mockResolvedValueOnce({
      id: 'uuid-x',
      email: 'user@example.com',
      password_hash: hash,
      created_at: '',
    })

    const result = await verifyUser('user@example.com', 'wrongpassword')
    expect(result).toBeNull()
  })

  it('returns user when credentials are correct', async () => {
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash(REAL_PASSWORD, 10)

    const fakeUser = {
      id: 'uuid-ok',
      email: 'user@example.com',
      password_hash: hash,
      created_at: '2026-01-01',
    }
    mockQueryOne.mockResolvedValueOnce(fakeUser)

    const result = await verifyUser('user@example.com', REAL_PASSWORD)
    expect(result).toEqual(fakeUser)
  })

  it('looks up user by lowercased trimmed email', async () => {
    mockQueryOne.mockResolvedValueOnce(null)

    await verifyUser('  USER@EXAMPLE.COM  ', 'any')

    expect(mockQueryOne).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE email = $1',
      ['user@example.com']
    )
  })

  it('handles DB error gracefully (propagates)', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('connection error'))
    await expect(verifyUser('a@b.com', 'pass')).rejects.toThrow('connection error')
  })
})

describe('getUserById', () => {
  it('returns user when found', async () => {
    const fakeUser = {
      id: 'uuid-123',
      email: 'user@example.com',
      password_hash: 'hash',
      created_at: '2026-01-01',
    }
    mockQueryOne.mockResolvedValueOnce(fakeUser)

    const result = await getUserById('uuid-123')
    expect(result).toEqual(fakeUser)
    expect(mockQueryOne).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['uuid-123'])
  })

  it('returns null when user not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    const result = await getUserById('nonexistent-uuid')
    expect(result).toBeNull()
  })
})
