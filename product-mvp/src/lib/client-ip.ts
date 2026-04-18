/**
 * Получение IP-адреса клиента с защитой от подделки X-Forwarded-For.
 *
 * X-Forwarded-For заголовок может быть подделан клиентом, если перед
 * приложением нет доверенного прокси. Злоумышленник отправляет
 * `X-Forwarded-For: 1.2.3.4` и обходит rate limit.
 *
 * Установить `TRUSTED_PROXY=1` в .env только если приложение за nginx
 * или Cloudflare, которые гарантированно выставляют этот заголовок.
 *
 * Без TRUSTED_PROXY rate-limit группирует всех пользователей в ключ 'anon' —
 * это защищает от DoS, но может ошибочно блокировать легитимных.
 * Ожидаемый деплой: ставить за обратный прокси И выставлять TRUSTED_PROXY=1.
 */
export function getClientIp(headers: Headers | { get: (k: string) => string | null }): string {
  const trusted = process.env.TRUSTED_PROXY === '1' || process.env.TRUSTED_PROXY === 'true'
  if (!trusted) return 'anon'
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'anon'
}
