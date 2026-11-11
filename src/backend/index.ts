import { createLocalBackend } from './local/index.ts'
import { createSupabaseBackend } from './supabase/index.ts'
import type { Backend } from './types.ts'

/**
 * El backend activo, según VITE_BACKEND:
 * - "supabase": producción.
 * - "local" (por defecto): datos de ejemplo guardados en el navegador, para
 *   probar la aplicación sin servidor.
 *
 * Para migrar a otro backend se agrega aquí su implementación de `Backend`.
 */
export const backend: Backend = import.meta.env.VITE_BACKEND === 'supabase' ? createSupabaseBackend() : createLocalBackend()

export { BackendError } from './types.ts'
