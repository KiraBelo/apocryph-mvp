import ru, { type Translations } from './ru'
import en from './en'

export type Lang = 'ru' | 'en'

const messages: Record<Lang, Translations> = { ru, en }

/** Get a nested translation value by dot-separated key */
export function translate(lang: Lang, key: string): string | readonly string[] | Record<string, string> {
  const parts = key.split('.')
  let val: unknown = messages[lang]
  for (const p of parts) {
    if (val && typeof val === 'object') val = (val as Record<string, unknown>)[p]
    else return key
  }
  if (typeof val === 'string' || Array.isArray(val)) return val
  if (val && typeof val === 'object') return val as Record<string, string>
  return key
}

export type { Translations }
export { ru, en }
