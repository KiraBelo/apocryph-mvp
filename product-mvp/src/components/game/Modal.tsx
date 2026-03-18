import React from 'react'

export default function Modal({ onClose, title, children, wide }: { onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="overlay z-[500] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal p-8 w-full max-h-[calc(100vh-2rem)] overflow-y-auto ${wide ? 'max-w-[680px]' : 'max-w-[480px]'}`}>
        <button onClick={onClose} className="sticky top-0 float-right bg-transparent border-none text-ink-2 cursor-pointer text-[1.1rem] z-10">✕</button>
        <h2 className="font-heading text-2xl italic text-ink mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}
