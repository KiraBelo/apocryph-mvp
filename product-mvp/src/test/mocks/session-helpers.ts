import { NextResponse } from 'next/server'

// Shared mock для handleAuthError — используется в vi.mock('@/lib/session', ...).
// Раньше копировался в 7 тестовых файлов; при изменении сигнатуры надо было
// обновлять каждый. Теперь один источник правды.
export function handleAuthErrorMock(error: string | null): NextResponse | null {
  if (error === 'unauthorized') return NextResponse.json({ error }, { status: 401 })
  if (error === 'banned') return NextResponse.json({ error: 'banned' }, { status: 403 })
  if (error === 'forbidden') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return null
}
