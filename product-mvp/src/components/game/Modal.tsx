import React from 'react'

export default function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="overlay z-[500] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal p-8 max-w-[480px] w-full">
        <button onClick={onClose} className="absolute top-4 right-4 bg-transparent border-none text-ink-2 cursor-pointer text-[1.1rem]">✕</button>
        <h2 className="font-heading text-2xl italic text-ink mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}
