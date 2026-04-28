/**
 * Centralised label maps for request/game enums.
 *
 * Each helper accepts the `t` function from `useT()` so labels are
 * localised. Call shape stays as a `Record<string, string>` to drop in
 * for the inline maps that used to be duplicated across components.
 *
 * Before audit-v4 cleanup, `pairingLabels` lived in 4 components with
 * the same body — easy to drift apart silently.
 */

type T = (key: string) => string | readonly string[] | Record<string, string>

export function getPairingLabels(t: T): Record<string, string> {
  return {
    sl: 'M/M',
    fm: 'F/F',
    gt: 'M/F',
    any: t('filters.anyPairing') as string,
    multi: t('filters.multi') as string,
    other: t('filters.other') as string,
  }
}
