import ru, { type Translations } from './ru'
import en from './en'

export type Lang = 'ru' | 'en'

const messages: Record<Lang, Translations> = { ru, en }

/** Get a nested translation value by dot-separated key */
export function translate(lang: Lang, key: string): string | readonly string[] {
  const parts = key.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let val: any = messages[lang]
  for (const p of parts) {
    val = val?.[p]
  }
  return val ?? key
}

export type { Translations }
export { ru, en }
