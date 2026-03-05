'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
export type FontSize = 'small' | 'medium' | 'large'
export type GameFont = 'serif' | 'serif-body' | 'mono'
export type GameSpacing = 'compact' | 'normal' | 'spacious'
export type GameLayout = 'dialog' | 'feed' | 'book'

export interface TagPreset {
  name: string
  tags: string
}

export interface Settings {
  theme: Theme
  fontSize: FontSize
  siteFont: string
  gameFont: GameFont
  gameSpacing: GameSpacing
  gameLayout: GameLayout
  emailNotifs: boolean
  notesEnabled: boolean
}

interface SettingsCtx extends Settings {
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  tagPresets: TagPreset[]
  setTagPreset: (index: number, preset: TagPreset) => void
}

const DEFAULTS: Settings = {
  theme: 'light',
  fontSize: 'medium',
  siteFont: 'Georgia, serif',
  gameFont: 'serif-body',
  gameSpacing: 'normal',
  gameLayout: 'dialog',
  emailNotifs: true,
  notesEnabled: true,
}

const DEFAULT_PRESETS: TagPreset[] = [
  { name: '', tags: '' },
  { name: '', tags: '' },
  { name: '', tags: '' },
]

const KEYS: Record<keyof Settings, string> = {
  theme: 'apocryph-theme',
  fontSize: 'apocryph-font-size',
  siteFont: 'apocryph-site-font',
  gameFont: 'apocryph-game-font',
  gameSpacing: 'apocryph-game-spacing',
  gameLayout: 'apocryph-game-layout',
  emailNotifs: 'apocryph-email-notifs',
  notesEnabled: 'apocryph-notes-enabled',
}

const TAG_PRESETS_KEY = 'apocryph-tag-presets'

const FONT_SIZES: Record<FontSize, string> = {
  small: '16px', medium: '18px', large: '20px',
}

const GAME_FONTS: Record<GameFont, string> = {
  serif: 'var(--serif)',
  'serif-body': 'var(--serif-body)',
  mono: 'var(--mono)',
}

const GAME_SPACINGS: Record<GameSpacing, string> = {
  compact: '0.75rem', normal: '1.5rem', spacious: '2.5rem',
}

function applyOne(key: keyof Settings, value: Settings[keyof Settings]) {
  const h = document.documentElement
  if (key === 'theme')       h.setAttribute('data-theme', value as string)
  if (key === 'fontSize')    h.style.fontSize = FONT_SIZES[value as FontSize]
  if (key === 'siteFont') {
    h.style.setProperty('--site-font', value as string)
    h.style.setProperty('--serif-body', value as string)
  }
  if (key === 'gameFont')    h.style.setProperty('--game-font', GAME_FONTS[value as GameFont])
  if (key === 'gameSpacing') h.style.setProperty('--game-gap', GAME_SPACINGS[value as GameSpacing])
}

function applyAllToDOM(s: Settings) {
  applyOne('theme', s.theme)
  applyOne('fontSize', s.fontSize)
  applyOne('siteFont', s.siteFont)
  applyOne('gameFont', s.gameFont)
  applyOne('gameSpacing', s.gameSpacing)
}

const Ctx = createContext<SettingsCtx>({
  ...DEFAULTS,
  panelOpen: false,
  openPanel: () => {},
  closePanel: () => {},
  set: () => {},
  tagPresets: DEFAULT_PRESETS,
  setTagPreset: () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [panelOpen, setPanelOpen] = useState(false)
  const [tagPresets, setTagPresets] = useState<TagPreset[]>(DEFAULT_PRESETS)

  useEffect(() => {
    const loaded: Settings = {
      theme: (localStorage.getItem(KEYS.theme) as Theme) ?? DEFAULTS.theme,
      fontSize: (localStorage.getItem(KEYS.fontSize) as FontSize) ?? DEFAULTS.fontSize,
      siteFont: localStorage.getItem(KEYS.siteFont) ?? DEFAULTS.siteFont,
      gameFont: (localStorage.getItem(KEYS.gameFont) as GameFont) ?? DEFAULTS.gameFont,
      gameSpacing: (localStorage.getItem(KEYS.gameSpacing) as GameSpacing) ?? DEFAULTS.gameSpacing,
      gameLayout: (localStorage.getItem(KEYS.gameLayout) as GameLayout) ?? DEFAULTS.gameLayout,
      emailNotifs: localStorage.getItem(KEYS.emailNotifs) !== 'false',
      notesEnabled: localStorage.getItem(KEYS.notesEnabled) !== 'false',
    }
    setSettings(loaded)
    applyAllToDOM(loaded)

    try {
      const saved = localStorage.getItem(TAG_PRESETS_KEY)
      if (saved) setTagPresets(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    localStorage.setItem(KEYS[key], String(value))
    applyOne(key, value)
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function setTagPreset(index: number, preset: TagPreset) {
    setTagPresets(prev => {
      const next = [...prev]
      next[index] = preset
      localStorage.setItem(TAG_PRESETS_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <Ctx.Provider value={{
      ...settings,
      panelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      set,
      tagPresets,
      setTagPreset,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSettings = () => useContext(Ctx)
