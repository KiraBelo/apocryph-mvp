export interface FontOption {
  label: string
  value: string // CSS font-family string
}

export interface FontGroup {
  key: string // i18n key under 'editor' namespace
  fonts: FontOption[]
}

export const FONT_GROUPS: FontGroup[] = [
  {
    key: 'fontSerif',
    fonts: [
      { label: 'Georgia', value: 'Georgia, serif' },
      { label: 'Times New Roman', value: 'Times New Roman, Times, serif' },
      { label: 'EB Garamond', value: 'EB Garamond, Georgia, serif' },
      { label: 'Cormorant', value: 'Cormorant Garamond, Georgia, serif' },
      { label: 'Lora', value: 'Lora, Georgia, serif' },
      { label: 'Playfair Display', value: 'Playfair Display, Georgia, serif' },
      { label: 'Merriweather', value: 'Merriweather, Georgia, serif' },
      { label: 'Crimson Pro', value: 'Crimson Pro, Georgia, serif' },
      { label: 'PT Serif', value: 'PT Serif, Georgia, serif' },
    ],
  },
  {
    key: 'fontSans',
    fonts: [
      { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
      { label: 'Roboto', value: 'Roboto, Arial, sans-serif' },
      { label: 'Calibri', value: 'Calibri, Candara, sans-serif' },
      { label: 'Raleway', value: 'Raleway, sans-serif' },
      { label: 'Montserrat', value: 'Montserrat, sans-serif' },
      { label: 'PT Sans', value: 'PT Sans, sans-serif' },
      { label: 'Open Sans', value: 'Open Sans, Arial, sans-serif' },
      { label: 'Nunito', value: 'Nunito, sans-serif' },
    ],
  },
  {
    key: 'fontHandwriting',
    fonts: [
      { label: 'Caveat', value: 'Caveat, cursive' },
      { label: 'Neucha', value: 'Neucha, cursive' },
      { label: 'Marck Script', value: 'Marck Script, cursive' },
    ],
  },
  {
    key: 'fontMono',
    fonts: [
      { label: 'PT Mono', value: 'PT Mono, monospace' },
      { label: 'Courier New', value: 'Courier New, Courier, monospace' },
    ],
  },
]

export const ALL_FONTS: FontOption[] = FONT_GROUPS.flatMap(g => g.fonts)
