import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import { MockEventSource } from '@/test/setup-client'
import { useGameSSE } from './hooks/useGameSSE'
import { useGameNotes } from './hooks/useGameNotes'
import RequestForm from './RequestForm'
import SettingsPanel from './SettingsPanel'
import { SettingsProvider } from './SettingsContext'
import type { Message } from './game/types'

// Coverage for the medium-priority UX bundle (audit-v4 PR #14). Each
// section here pins a specific behaviour change so the next refactor
// has to deal with it explicitly.

// ── 1. useGameSSE — outage threshold ──────────────────────────────────────
//
// Behaviour: useGameSSE counts consecutive `onerror` events with no
// successful `onmessage` in between. Once the count crosses
// ERROR_TOAST_THRESHOLD (3), `onConnectionLost` fires once per outage.
// The counter and notification flag both reset on the next successful
// message.

describe('useGameSSE — outage threshold (audit-v4 medium)', () => {
  const noop = () => {}

  function SSEHarness({ onConnectionLost, gameId = 'g1' }: { onConnectionLost: () => void; gameId?: string }) {
    useGameSSE({
      gameId, isLeft: false,
      onNewMessage: noop, onEditMessage: noop, onDiceMessage: noop,
      onStatusChanged: noop, onPublishRequest: noop, onPublishRevoked: noop,
      onConnectionLost,
    })
    return null
  }

  function dispatchErrors(n: number) {
    const es = MockEventSource.instances.at(-1)!
    for (let i = 0; i < n; i++) es.dispatchError()
  }

  it('does not call onConnectionLost below the threshold (2 consecutive errors)', () => {
    const lost = vi.fn()
    renderWithProviders(<SSEHarness onConnectionLost={lost} />)
    dispatchErrors(2)
    expect(lost).not.toHaveBeenCalled()
  })

  it('calls onConnectionLost exactly once on threshold (3 consecutive errors)', () => {
    const lost = vi.fn()
    renderWithProviders(<SSEHarness onConnectionLost={lost} />)
    dispatchErrors(3)
    expect(lost).toHaveBeenCalledTimes(1)
  })

  it('does not re-fire after additional errors within the same outage (5 in a row → still 1 call)', () => {
    const lost = vi.fn()
    renderWithProviders(<SSEHarness onConnectionLost={lost} />)
    dispatchErrors(5)
    expect(lost).toHaveBeenCalledTimes(1)
  })

  it('resets after a successful message — second outage triggers a second toast', () => {
    const lost = vi.fn()
    renderWithProviders(<SSEHarness onConnectionLost={lost} />)
    dispatchErrors(3)
    expect(lost).toHaveBeenCalledTimes(1)

    // Successful message arrives → counter and notified flag reset.
    MockEventSource.instances.at(-1)!.dispatchMessage({ id: 'm1', type: 'ic', content: 'hi', created_at: '2026-01-01' })
    dispatchErrors(3)
    expect(lost).toHaveBeenCalledTimes(2)
  })
})

// ── 2. useGameNotes — quote-toast cleanup ─────────────────────────────────
//
// Behaviour: the 2-second quote-toast timer is held in a ref and
// cleared on unmount, so navigating away within the window does not
// queue a setState on a dead component.

describe('useGameNotes — quote-toast timer cleanup (audit-v4 medium)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  function NotesHarness({ trigger }: { trigger: (q: (msg: Message, setTab: (tab: 'notes') => void) => void) => void }) {
    const notes = useGameNotes({ gameId: 'g1', t: () => '', addToast: noop })
    trigger(notes.quotePost)
    return <div data-testid="quote-toast">{notes.quoteToast ? 'visible' : 'hidden'}</div>
  }
  const noop = () => {}

  it('clearing the quote toast on unmount does not throw "setState on unmounted"', () => {
    let triggerQuote: ((msg: Message, setTab: (tab: 'notes') => void) => void) | null = null
    const { unmount } = renderWithProviders(
      <NotesHarness trigger={(q) => { triggerQuote = q }} />,
    )
    triggerQuote!({ id: 'm', type: 'ic', content: 'hello', nickname: 'Luna', created_at: '2026-01-01' } as unknown as Message, () => {})

    // Unmount BEFORE the 2 s timer fires — without the cleanup,
    // setQuoteToast(false) would run on a dead component.
    unmount()

    // Sanity: a console.error on unmounted setState would be raised
    // here. We use a spy to make the assertion explicit.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.advanceTimersByTime(2500)
    expect(errSpy).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })
})

// ── 3. RequestForm — autoFocus on title ──────────────────────────────────
//
// Behaviour: title input is focused on mount when creating a new
// request, but NOT when editing (so users editing a tag don't get
// yanked back to title).

describe('RequestForm — autoFocus title (audit-v4 medium)', () => {
  it('focuses the title input on a new request', () => {
    renderWithProviders(<RequestForm />)
    const title = screen.getByPlaceholderText(/коротко|short/i) as HTMLInputElement
    expect(document.activeElement).toBe(title)
  })

  it('does not focus the title when editing an existing request', () => {
    renderWithProviders(
      <RequestForm
        initial={{
          id: 'r1', title: 'Existing', body: null, type: 'duo', content_level: 'none',
          fandom_type: 'fandom', pairing: 'sl', language: 'ru', tags: [], is_public: true, status: 'active',
        }}
      />,
    )
    const title = screen.getByDisplayValue('Existing') as HTMLInputElement
    expect(document.activeElement).not.toBe(title)
  })
})

// ── 4. SettingsPanel — aria-pressed on toggle buttons ─────────────────────
//
// Behaviour: theme picker and BtnGroup buttons (language / fontSize /
// spacing) announce their pressed state to assistive tech.

describe('SettingsPanel — aria-pressed (audit-v4 medium)', () => {
  it('marks exactly one theme button as pressed (the active theme)', async () => {
    const { user } = renderWithProviders(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    )
    // Theme picker lives inside an accordion Row. Click "Тема" to expand.
    const themeRow = screen.getByRole('button', { name: /тема|theme/i })
    await user.click(themeRow)

    // 4 theme buttons exist after expand. Exactly one is aria-pressed=true,
    // the others false. Independent of locale and theme labels.
    const themeButtons = screen.getAllByRole('button')
      .filter(b => b.getAttribute('aria-pressed') !== null && b.style.minWidth === '64px')
    expect(themeButtons.length).toBeGreaterThanOrEqual(4)
    const pressed = themeButtons.filter(b => b.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
  })

  it('marks the active language in BtnGroup as pressed', async () => {
    const { user } = renderWithProviders(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    )
    const langRow = screen.getByRole('button', { name: /язык|language/i })
    await user.click(langRow)

    const ruBtn = screen.getByRole('button', { name: 'Русский' })
    expect(ruBtn).toHaveAttribute('aria-pressed', 'true')
    const enBtn = screen.getByRole('button', { name: 'English' })
    expect(enBtn).toHaveAttribute('aria-pressed', 'false')
  })
})
