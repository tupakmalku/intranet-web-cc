import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { backend } from '../backend/index.ts'
import type { Session } from '../domain/types.ts'
import { AuthContext, type AuthState, type SignOutReason } from './auth.ts'

const NOTICES: Record<SignOutReason, string> = {
  idle: 'Tu sesión se cerró por inactividad. Vuelve a ingresar.',
  expired: 'Tu sesión llegó a su duración máxima. Vuelve a ingresar.',
}

/** Mantiene la sesión del usuario y la ofrece al resto de la aplicación. */
export default function AuthProvider({ children }: { children: ReactNode }) {
  // Undefined: todavía se está comprobando si hay una sesión abierta.
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    backend.auth.getSession().then(setSession, () => setSession(null))
  }, [])

  const auth = useMemo<AuthState>(
    () => ({
      session: session ?? null,
      notice,
      async signIn(email, password) {
        setSession(await backend.auth.signIn(email, password))
        setNotice(null)
      },
      async signOut(reason) {
        // Aunque falle la llamada (sin conexión), la sesión se cierra en este navegador.
        await backend.auth.signOut(reason ? 'expired' : undefined).catch(() => {})
        setSession(null)
        setNotice(reason ? NOTICES[reason] : null)
      },
      async refresh() {
        setSession(await backend.auth.getSession())
      },
    }),
    [session, notice],
  )

  if (session === undefined) return <p className="loading">Cargando…</p>
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
