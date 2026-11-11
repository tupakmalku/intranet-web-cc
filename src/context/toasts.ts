import { createContext, useContext } from 'react'

/** Muestra un aviso flotante de confirmación durante unos segundos. */
export type ShowToast = (message: string) => void

export const ToastContext = createContext<ShowToast | null>(null)

export function useToast(): ShowToast {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast se usa dentro de ToastProvider.')
  return show
}
