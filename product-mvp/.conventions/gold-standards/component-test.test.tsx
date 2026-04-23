/**
 * GOLD STANDARD: клиентский компонент-тест
 *
 * Проверяет поведение небольшого компонента в изоляции.
 * Всегда импортируем render/screen из `@/test/test-utils`, не напрямую из RTL.
 * Тест написан на ПОВЕДЕНИЕ (что видит пользователь), не на внутренности.
 */
import { describe, it, expect } from 'vitest'
import Breadcrumbs from '@/components/Breadcrumbs'
import { renderWithProviders, screen } from '@/test/test-utils'

describe('Breadcrumbs', () => {
  it('renders each item in order', () => {
    renderWithProviders(
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Заявки' }]} />,
    )

    expect(screen.getByText('Главная')).toBeInTheDocument()
    expect(screen.getByText('Заявки')).toBeInTheDocument()
  })

  it('renders linked items as anchors', () => {
    renderWithProviders(
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }]} />,
    )

    const link = screen.getByRole('link', { name: 'Главная' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('marks the last item without href as current page', () => {
    renderWithProviders(
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Заявки' }]} />,
    )

    expect(screen.getByText('Заявки')).toHaveAttribute('aria-current', 'page')
  })

  it('uses Breadcrumb landmark for accessibility', () => {
    renderWithProviders(<Breadcrumbs items={[{ label: 'Home' }]} />)

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })
})
