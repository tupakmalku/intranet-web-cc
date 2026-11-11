import { useState } from 'react'
import { errorMessage } from './errors.ts'

/**
 * Estado de envío de un formulario: evita el doble envío mientras se guarda y
 * conserva el mensaje si el backend falla.
 */
export function useSubmit() {
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState('')

  /** Ejecuta la operación. Devuelve true si terminó bien. */
  async function submit(operation: () => Promise<void>): Promise<boolean> {
    if (saving) return false
    setSaving(true)
    setFailure('')
    try {
      await operation()
      return true
    } catch (error) {
      setFailure(errorMessage(error))
      return false
    } finally {
      setSaving(false)
    }
  }

  return { saving, failure, submit }
}
