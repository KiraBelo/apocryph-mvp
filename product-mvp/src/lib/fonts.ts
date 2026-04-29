export interface FontOption {
  label: string
  value: string // CSS font-family string
  /** Имя для Google Fonts URL (`Lora`, `Cormorant Garamond`). Null = системный/self-hosted, не грузить. */
  googleName: string | null
  /** Веса для Google Fonts URL, формат: `400;500` или `300;400;500;600`. */
  weights: string
  /** Включать ли italic-версии. */
  italic: boolean
}

export interface FontGroup {
  key: string // i18n key under 'editor' namespace
  fonts: FontOption[]
}

export const FONT_GROUPS: FontGroup[] = [
  {
    key: 'fontSerif',
    fonts: [
      { label: 'Georgia',          value: 'Georgia, serif',                       googleName: null,                   weights: '',                  italic: false },
      { label: 'Times New Roman',  value: 'Times New Roman, Times, serif',        googleName: null,                   weights: '',                  italic: false },
      { label: 'EB Garamond',      value: 'EB Garamond, Georgia, serif',          googleName: 'EB Garamond',          weights: '400;500',           italic: true  },
      { label: 'Cormorant',        value: 'Cormorant Garamond, Georgia, serif',   googleName: null,                   weights: '',                  italic: false },
      { label: 'Lora',             value: 'Lora, Georgia, serif',                 googleName: 'Lora',                 weights: '400;500',           italic: true  },
      { label: 'Playfair Display', value: 'Playfair Display, Georgia, serif',     googleName: 'Playfair Display',     weights: '400;500',           italic: true  },
      { label: 'Merriweather',     value: 'Merriweather, Georgia, serif',         googleName: 'Merriweather',         weights: '300;400',           italic: true  },
      { label: 'Crimson Pro',      value: 'Crimson Pro, Georgia, serif',          googleName: 'Crimson Pro',          weights: '400;500',           italic: true  },
      { label: 'PT Serif',         value: 'PT Serif, Georgia, serif',             googleName: 'PT Serif',             weights: '400;700',           italic: true  },
    ],
  },
  {
    key: 'fontSans',
    fonts: [
      { label: 'Arial',       value: 'Arial, Helvetica, sans-serif',     googleName: null,         weights: '',           italic: false },
      { label: 'Roboto',      value: 'Roboto, Arial, sans-serif',        googleName: 'Roboto',     weights: '300;400;500', italic: true  },
      { label: 'Calibri',     value: 'Calibri, Candara, sans-serif',     googleName: null,         weights: '',           italic: false },
      { label: 'Raleway',     value: 'Raleway, sans-serif',              googleName: 'Raleway',    weights: '300;400',     italic: true  },
      { label: 'Montserrat',  value: 'Montserrat, sans-serif',           googleName: 'Montserrat', weights: '300;400;500', italic: true  },
      { label: 'PT Sans',     value: 'PT Sans, sans-serif',              googleName: 'PT Sans',    weights: '400;700',     italic: true  },
      { label: 'Open Sans',   value: 'Open Sans, Arial, sans-serif',     googleName: 'Open Sans',  weights: '300;400;500', italic: true  },
      { label: 'Nunito',      value: 'Nunito, sans-serif',               googleName: 'Nunito',     weights: '300;400;500', italic: true  },
    ],
  },
  {
    key: 'fontHandwriting',
    fonts: [
      { label: 'Caveat',       value: 'Caveat, cursive',       googleName: 'Caveat',       weights: '400;500', italic: false },
      { label: 'Neucha',       value: 'Neucha, cursive',       googleName: 'Neucha',       weights: '400',     italic: false },
      { label: 'Marck Script', value: 'Marck Script, cursive', googleName: 'Marck Script', weights: '400',     italic: false },
    ],
  },
  {
    key: 'fontMono',
    fonts: [
      { label: 'PT Mono',     value: 'PT Mono, monospace',                  googleName: 'PT Mono', weights: '400', italic: false },
      { label: 'Courier New', value: 'Courier New, Courier, monospace',     googleName: null,      weights: '',    italic: false },
    ],
  },
]

export const ALL_FONTS: FontOption[] = FONT_GROUPS.flatMap(g => g.fonts)

/** Карта `googleName` → metadata. Для построения Google Fonts URL по имени шрифта. */
export const FONT_METADATA: Record<string, { weights: string; italic: boolean }> = Object.fromEntries(
  ALL_FONTS
    .filter((f): f is FontOption & { googleName: string } => f.googleName !== null)
    .map(f => [f.googleName, { weights: f.weights, italic: f.italic }])
)

/** Список Google-шрифтов, которые надо лениво подгружать (всё кроме системных и self-hosted). */
export const LAZY_GOOGLE_FONTS: string[] = Object.keys(FONT_METADATA)
