export function tabBtnCls(isActive: boolean, tab: 'ic' | 'ooc' | 'notes' | 'prepare'): string {
  const base = 'font-mono text-[0.6rem] tracking-[0.1em] uppercase p-[0.3rem_0.7rem] bg-transparent border-none cursor-pointer transition-colors duration-150'
  const color = tab === 'ic'
    ? (isActive ? 'text-accent border-b-2 border-accent' : 'text-ink-3 border-b-2 border-transparent')
    : (isActive ? 'text-ink-2 border-b-2 border-ink-2' : 'text-ink-3 border-b-2 border-transparent')
  return `${base} ${color}`
}
