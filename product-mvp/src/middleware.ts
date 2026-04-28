import { NextRequest, NextResponse } from 'next/server'

// Nonce-based CSP. На каждый запрос генерируем уникальный nonce,
// кладём в response header — Next.js автоматически проставляет его
// в inline-скрипты гидратации.
//
// 'strict-dynamic' — современные браузеры игнорируют 'unsafe-inline' если
// есть nonce/strict-dynamic. 'unsafe-inline' оставлен как fallback для
// старых браузеров (которые игнорируют nonce/strict-dynamic).
//
// HIGH-S1 (audit-v4): `https:` убран из script-src — он добавлял доверие
// к ЛЮБОМУ HTTPS-домену (полностью обходя whitelist), что в связке с
// `'unsafe-inline'`-fallback расширяло поверхность XSS на старых браузерах.
// Без него: на современных — nonce + strict-dynamic, на старых — только
// 'self' + unsafe-inline. Любые сторонние скрипты (если понадобятся в
// будущем) добавляем явно по hostname.
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' https: data:`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', cspHeader)
  return response
}

// Middleware не запускаем для статики и preflight prefetch (чтобы каждый
// prefetch не генерил новый nonce и не invalidate кэш).
export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
