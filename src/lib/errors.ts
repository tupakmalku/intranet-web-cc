import { BackendError } from '../backend/types.ts'

/** Mensaje para mostrar al usuario. Los errores imprevistos no revelan detalles técnicos. */
export function errorMessage(error: unknown): string {
  if (error instanceof BackendError) return error.message
  console.error(error)
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}
