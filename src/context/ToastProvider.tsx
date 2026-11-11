import { useCallback, useState, type ReactNode } from 'react'
import Icon from '../components/ui/Icon.tsx'
import { ToastContext } from './toasts.ts'

const VISIBLE_MS = 3500

/** Muestra los avisos flotantes de confirmación ("Documento guardado"). */
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([])

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), VISIBLE_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className="notice notice-success">
            <Icon name="check" size={18} />
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
