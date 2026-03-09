'use client'
import { useEffect } from 'react'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let saved = localStorage.getItem('apocryph-theme') || 'light'
    const valid = ['light', 'sepia', 'ink', 'nocturne']
    if (!valid.includes(saved)) { saved = 'light'; localStorage.setItem('apocryph-theme', 'light') }
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  return <>{children}</>
}
