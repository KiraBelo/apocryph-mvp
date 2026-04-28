import { describe, it, expect, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import ConfirmDialog from './ConfirmDialog'
import FilterSelect from './FilterSelect'
import LibraryClient from './LibraryClient'
import { renderWithProviders, screen, waitFor } from '@/test/test-utils'
import { server } from '@/test/mocks/server'

// HIGH-U2 (audit-v4): Tab/Shift+Tab cycle inside ConfirmDialog so focus
// can never leak back to the page underneath while the modal is open.
describe('ConfirmDialog focus trap (HIGH-U2 regression)', () => {
  function renderOpen() {
    return renderWithProviders(
      <ConfirmDialog
        open
        title="Delete?"
        message="Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
  }

  it('Tab from Confirm wraps focus to Cancel', async () => {
    const { user } = renderOpen()
    const confirm = screen.getByRole('button', { name: 'Delete' })
    const cancel = screen.getByRole('button', { name: 'Cancel' })

    confirm.focus()
    expect(document.activeElement).toBe(confirm)

    await user.tab()
    expect(document.activeElement).toBe(cancel)
  })

  it('Shift+Tab from Cancel wraps focus to Confirm', async () => {
    const { user } = renderOpen()
    const confirm = screen.getByRole('button', { name: 'Delete' })
    const cancel = screen.getByRole('button', { name: 'Cancel' })

    cancel.focus()
    expect(document.activeElement).toBe(cancel)

    await user.tab({ shift: true })
    expect(document.activeElement).toBe(confirm)
  })
})

// HIGH-U3 (audit-v4): keyboard navigation in the dropdown — ArrowDown /
// ArrowUp move highlight, Enter commits, Escape closes and returns
// focus to the trigger button.
describe('FilterSelect keyboard navigation (HIGH-U3 regression)', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ]

  it('ArrowDown + Enter selects the next option', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(
      <FilterSelect value="a" onChange={onChange} options={options} variant="filter" />,
    )

    const trigger = screen.getByRole('button', { name: /alpha/i })
    trigger.focus()
    await user.keyboard('{ArrowDown}') // open
    await user.keyboard('{ArrowDown}') // move highlight from "a" → "b"
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('Escape closes the dropdown and returns focus to the trigger', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(
      <FilterSelect value="" onChange={onChange} options={options} variant="filter" />,
    )

    const trigger = screen.getByRole('button', { name: /alpha/i })
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(document.activeElement).toBe(trigger)
  })
})

// HIGH-U1 (audit-v4): when the public-games request fails, LibraryClient
// must surface an error state with a Retry button instead of getting
// stuck on the loading skeleton or pretending the catalog is empty.
describe('LibraryClient error state (HIGH-U1 regression)', () => {
  it('shows error message and Retry button on fetch failure, recovers on retry', async () => {
    let calls = 0
    server.use(
      http.get('/api/public-games', () => {
        calls += 1
        if (calls === 1) return HttpResponse.json({ error: 'serverError' }, { status: 500 })
        return HttpResponse.json({ games: [], total: 0, totalPages: 0 })
      }),
    )

    const { user } = renderWithProviders(<LibraryClient />)

    const retry = await screen.findByRole('button', { name: /повторить|retry/i })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.click(retry)

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(calls).toBe(2)
  })
})
