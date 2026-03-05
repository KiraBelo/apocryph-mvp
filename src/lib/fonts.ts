export interface FontOption {
  label: string
  value: string // CSS font-family string
}

export interface FontGroup {
  label: string
  fonts: FontOption[]
}

export const FONT_GROUPS: FontGroup[] = [
  {
    label: 'Серифные',
    fonts: [
      { label: 'EB Garamond', value: 'EB Garamond, Georgia, serif' },
      { label: 'Cormorant', value: 'Cormorant Garamond, Georgia, serif' },
      { label: 'Lora', value: 'Lora, Georgia, serif' },
      { label: 'Playfair Display', value: 'Playfair Display, Georgia, serif' },
      { label: 'Merriweather', value: 'Merriweather, Georgia, serif' },
      { label: 'Crimson Pro', value: 'Crimson Pro, Georgia, serif' },
      { label: 'PT Serif', value: 'PT Serif, Georgia, serif' },
      { label: 'Georgia', value: 'Georgia, serif' },
    ],
  },
  {
    label: 'Рукописные',
    fonts: [
      { label: 'Caveat', value: 'Caveat, cursive' },
      { label: 'Neucha', value: 'Neucha, cursive' },
      { label: 'Marck Script', value: 'Marck Script, cursive' },
    ],
  },
  {
    label: 'Без засечек',
    fonts: [
      { label: 'Raleway', value: 'Raleway, sans-serif' },
      { label: 'Montserrat', value: 'Montserrat, sans-serif' },
      { label: 'PT Sans', value: 'PT Sans, sans-serif' },
    ],
  },
  {
    label: 'Моноширинный',
    fonts: [
      { label: 'PT Mono', value: 'PT Mono, monospace' },
    ],
  },
]

export const ALL_FONTS: FontOption[] = FONT_GROUPS.flatMap(g => g.fonts)
