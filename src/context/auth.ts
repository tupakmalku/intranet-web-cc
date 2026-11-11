import { createContext, useContext } from 'react'
import type { Permission, Session } from '../domain/types.ts'

/** Por qué se cerró la sesión sin que el usuario lo pidiera. */
export type SignOutReason = 'idle' | 'expired'

export interface AuthState {
  /** Null mientras no se haya ingresado. */
  session: Session | null
  /** Aviso para la pantalla de ingreso cuando la sesión se cerró sola (por inactividad o por duración). */
  notice: string | null
  signIn: (email: string, password: string) => Promise<void>
  /** Cierra la sesión. Con un motivo, la pantalla de ingreso explica por qué. */
  signOut: (reason?: SignOutReason) => Promise<void>
  /** Vuelve a leer la sesión, por ejemplo después de cambiar la contraseña. */
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth se usa dentro de AuthProvider.')
  return auth
}

/** La sesión dentro de las pantallas que ya exigen haber ingresado, con atajos para los permisos. */
export function useSession() {
  const { session } = useAuth()
  if (!session) throw new Error('useSession se usa solo con la sesión iniciada.')
  const can = (permission: Permission) => session.role.permissions.includes(permission)
  return { ...session, can }
}
