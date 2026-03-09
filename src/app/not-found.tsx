import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem', textAlign: 'center' }}>
      <div>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: '1rem' }}>
          § 404
        </p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text)', marginBottom: '1rem' }}>
          Страница не найдена
        </h1>
        <p style={{ color: 'var(--text-2)', fontFamily: 'var(--serif-body)', fontSize: '1.05rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          Такой страницы не существует. Возможно, ссылка устарела или была изменена.
        </p>
        <Link href="/" style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1rem', color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>
          ← На главную
        </Link>
      </div>
    </div>
  )
}
