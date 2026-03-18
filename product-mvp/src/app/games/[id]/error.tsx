'use client'

import Link from 'next/link'

export default function GameError({ reset }: { reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-8 text-center">
      <div>
        <p className="section-label text-accent-2 mb-4">
          § ошибка
        </p>
        <h1 className="font-heading text-[clamp(2rem,6vw,3.5rem)] italic font-light text-ink mb-4">
          Не удалось загрузить игру
        </h1>
        <p className="text-ink-2 font-body text-[1.05rem] max-w-[400px] mx-auto mb-8">
          Произошла ошибка при загрузке игрового диалога. Попробуйте обновить страницу или вернуться к списку игр.
        </p>
        <div className="flex gap-6 justify-center">
          <button onClick={reset} className="font-heading italic text-[1rem] text-accent border-b border-current bg-transparent cursor-pointer">
            Попробовать снова
          </button>
          <Link href="/my/games" className="font-heading italic text-[1rem] text-ink-2 border-b border-current">
            Мои игры
          </Link>
        </div>
      </div>
    </div>
  )
}
