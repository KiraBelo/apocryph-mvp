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

/** Pick the correct plural form for `n`.
 *  Russian: 3 forms — [one, few, many] (1 пост / 2 поста / 5 постов)
 *  English: 2 forms — [one, other]     (1 post  / 2 posts)
 */
export function plural(lang: Lang, n: number, forms: readonly string[]): string {
  if (lang === 'ru') {
    const abs = Math.abs(n)
    const mod10 = abs % 10
    const mod100 = abs % 100
    let idx: number
    if (mod10 === 1 && mod100 !== 11) idx = 0        // 1, 21, 31…
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) idx = 1  // 2-4, 22-24…
    else idx = 2                                       // 0, 5-20, 25-30…
    return `${n} ${forms[idx] ?? forms[forms.length - 1]}`
  }
  // English: 2 forms
  return `${n} ${n === 1 ? forms[0] : (forms[1] ?? forms[0])}`
}

export type { Translations }
export { ru, en }
