import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { backend } from '../backend/index.ts'
import type { Session } from '../domain/types.ts'
import { AuthContext, type AuthState } from './auth.ts'

/** Mantiene la sesión del usuario y la ofrece al resto de la aplicación. */
export default function AuthProvider({ children }: { children: ReactNode }) {
  // Undefined: todavía se está comprobando si hay una sesión abierta.
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    backend.auth.getSession().then(setSession, () => setSession(null))
  }, [])

  const auth = useMemo<AuthState>(
    () => ({
      session: session ?? null,
      async signIn(email, password) {
        setSession(await backend.auth.signIn(email, password))
      },
      async signOut() {
        await backend.auth.signOut()
        setSession(null)
      },
      async refresh() {
        setSession(await backend.auth.getSession())
      },
    }),
    [session],
  )

  if (session === undefined) return <p className="loading">Cargando…</p>
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
