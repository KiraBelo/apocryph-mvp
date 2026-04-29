import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen, act } from '@testing-library/react'
import { SettingsProvider, useSettings } from '@/components/SettingsContext'
import SettingsPanel from '@/components/SettingsPanel'

vi.mock('@/lib/font-loader', () => ({
  loadFont: vi.fn(),
  loadFonts: vi.fn(),
  loadAllCatalogFonts: vi.fn(),
}))

import { loadAllCatalogFonts } from '@/lib/font-loader'

function PanelOpener() {
  const { openPanel } = useSettings()
  return (
    <button data-testid="open-panel" onClick={openPanel}>
      open
    </button>
  )
}

function renderPanelOpen() {
  const utils = render(
    <SettingsProvider>
      <PanelOpener />
      <SettingsPanel />
    </SettingsProvider>
  )
  act(() => {
    fireEvent.click(utils.getByTestId('open-panel'))
  })
  return utils
}

describe('SettingsPanel — font dropdown lazy-loads catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('does not load catalog fonts when the panel is just opened (Шрифт row collapsed)', () => {
    renderPanelOpen()
    expect(loadAllCatalogFonts).not.toHaveBeenCalled()
  })

  it('loads all catalog fonts when the «Шрифт» row is expanded', () => {
    renderPanelOpen()

    const fontRow = screen.getByRole('button', { name: 'Шрифт' })
    act(() => {
      fireEvent.click(fontRow)
    })

    expect(loadAllCatalogFonts).toHaveBeenCalledTimes(1)
  })

  it('does not load fonts when expanding a different row (e.g. «Тема»)', () => {
    renderPanelOpen()
    const themeRow = screen.getByRole('button', { name: 'Тема' })
    act(() => {
      fireEvent.click(themeRow)
    })
    expect(loadAllCatalogFonts).not.toHaveBeenCalled()
  })
})
