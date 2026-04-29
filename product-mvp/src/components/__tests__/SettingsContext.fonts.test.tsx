import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { SettingsProvider, useSettings } from '@/components/SettingsContext'

vi.mock('@/lib/font-loader', () => ({
  loadFont: vi.fn(),
  loadFonts: vi.fn(),
  loadAllCatalogFonts: vi.fn(),
}))

import { loadFont } from '@/lib/font-loader'

function FontController({
  onSet,
}: {
  onSet?: (set: ReturnType<typeof useSettings>['set']) => void
}) {
  const { set } = useSettings()
  if (onSet) onSet(set)
  return null
}

describe('SettingsContext — siteFont lazy loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('calls loadFont on hydration when saved siteFont differs from default', () => {
    localStorage.setItem('apocryph-site-font', 'Lora, Georgia, serif')
    render(
      <SettingsProvider>
        <FontController />
      </SettingsProvider>
    )
    expect(loadFont).toHaveBeenCalledTimes(1)
    expect(loadFont).toHaveBeenCalledWith('Lora, Georgia, serif')
  })

  it('does not call loadFont when siteFont is the default (Georgia)', () => {
    localStorage.setItem('apocryph-site-font', 'Georgia, serif')
    render(
      <SettingsProvider>
        <FontController />
      </SettingsProvider>
    )
    expect(loadFont).not.toHaveBeenCalled()
  })

  it('does not call loadFont when localStorage is empty (uses default)', () => {
    render(
      <SettingsProvider>
        <FontController />
      </SettingsProvider>
    )
    expect(loadFont).not.toHaveBeenCalled()
  })

  it('calls loadFont when set("siteFont", value) changes the font', () => {
    let setRef: ReturnType<typeof useSettings>['set'] | null = null
    render(
      <SettingsProvider>
        <FontController onSet={(s) => (setRef = s)} />
      </SettingsProvider>
    )
    vi.clearAllMocks()
    act(() => {
      setRef!('siteFont', 'PT Serif, Georgia, serif')
    })
    expect(loadFont).toHaveBeenCalledTimes(1)
    expect(loadFont).toHaveBeenCalledWith('PT Serif, Georgia, serif')
  })

  it('does not call loadFont when set is used for a non-font setting', () => {
    let setRef: ReturnType<typeof useSettings>['set'] | null = null
    render(
      <SettingsProvider>
        <FontController onSet={(s) => (setRef = s)} />
      </SettingsProvider>
    )
    vi.clearAllMocks()
    act(() => {
      setRef!('theme', 'nocturne')
    })
    expect(loadFont).not.toHaveBeenCalled()
  })
})
