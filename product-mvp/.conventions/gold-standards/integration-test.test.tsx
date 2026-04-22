/**
 * GOLD STANDARD: integration-тест с MSW
 *
 * Проверяет взаимодействие компонента с API: компонент делает fetch,
 * MSW перехватывает запрос и отдаёт мок-ответ, UI обновляется,
 * тест проверяет что пользователь видит правильный результат.
 *
 * Используем inline test-component для демонстрации паттерна.
 * В реальных тестах импортируем настоящий компонент из src/components.
 */
import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { useEffect, useState } from 'react'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { server } from '@/test/mocks/server'

interface Tag {
  id: string
  name: string
}

function TagList() {
  const [tags, setTags] = useState<Tag[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tags?q=test')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { tags: Tag[] }) => setTags(data.tags))
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <p role="alert">Ошибка: {error}</p>
  if (!tags) return <p>Загрузка…</p>
  if (tags.length === 0) return <p>Нет тегов</p>
  return (
    <ul>
      {tags.map((t) => (
        <li key={t.id}>{t.name}</li>
      ))}
    </ul>
  )
}

describe('TagList (integration with MSW)', () => {
  it('renders tags from API', async () => {
    server.use(
      http.get('/api/tags', () =>
        HttpResponse.json({ tags: [{ id: '1', name: 'drama' }, { id: '2', name: 'fantasy' }] }),
      ),
    )

    renderWithProviders(<TagList />)

    expect(screen.getByText('Загрузка…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('drama')).toBeInTheDocument())
    expect(screen.getByText('fantasy')).toBeInTheDocument()
  })

  it('shows empty state when API returns no tags', async () => {
    server.use(
      http.get('/api/tags', () => HttpResponse.json({ tags: [] })),
    )

    renderWithProviders(<TagList />)

    await waitFor(() => expect(screen.getByText('Нет тегов')).toBeInTheDocument())
  })

  it('shows error when API fails', async () => {
    server.use(
      http.get('/api/tags', () => new HttpResponse(null, { status: 500 })),
    )

    renderWithProviders(<TagList />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('500')
    })
  })
})
