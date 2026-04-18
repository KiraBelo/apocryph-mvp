'use client'
import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="font-mono text-[0.62rem] tracking-[0.08em] text-ink-2 mb-4">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5 opacity-50">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-accent transition-colors">{item.label}</Link>
          ) : (
            <span aria-current="page" className="text-ink-3">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
