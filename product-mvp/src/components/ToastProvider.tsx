'use client'
import { createContext, useCallback, useContext, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const typeStyles: Record<ToastType, string> = {
    success: 'border-l-[3px] border-l-[#2d8a4e]',
    error: 'border-l-[3px] border-l-[#c0392b]',
    warning: 'border-l-[3px] border-l-[#e67e22]',
    info: 'border-l-[3px] border-l-accent',
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-[340px]"
          aria-live="polite"
          aria-relevant="additions"
        >
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`bg-surface border border-edge shadow-[0_4px_16px_rgba(0,0,0,0.12)] px-4 py-3 flex items-start gap-3 ${typeStyles[toast.type]}`}
              style={{ animation: 'fadeInUp 0.25s ease' }}
            >
              <span className="font-body text-[0.85rem] text-ink flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="bg-transparent border-none text-ink-2 cursor-pointer text-[0.8rem] p-0 leading-none shrink-0"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
