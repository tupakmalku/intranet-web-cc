import { useState, type FormEvent } from 'react'
import { backend } from '../backend/index.ts'
import AuthShell from '../components/AuthShell.tsx'
import MfaSetup from '../components/MfaSetup.tsx'
import Button from '../components/ui/Button.tsx'
import CodeField from '../components/ui/CodeField.tsx'
import { useAuth } from '../context/auth.ts'
import { useSubmit } from '../lib/useSubmit.ts'

/**
 * Pantalla que bloquea el paso hasta la verificación en dos pasos: pide el
 * código si el usuario ya tiene la aplicación configurada, o la configura si
 * la política de la institución se la exige y todavía no la tiene.
 */
export default function VerificacionPage() {
  const { session, signOut, refresh } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const { saving, failure, submit } = useSubmit()
  const leave = (
    <Button variant="text" onClick={() => signOut()}>
      Salir
    </Button>
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return setError('Escribe los 6 dígitos que muestra la aplicación.')
    setError('')
    if (await submit(() => backend.auth.verifyMfa(code))) await refresh()
  }

  if (!session?.mfa.enrolled) {
    return (
      <AuthShell
        title="Protege tu cuenta"
        intro={
          <>
            {session?.user.fullName}, la institución pide la <strong>verificación en dos pasos</strong> para tu rol: además de tu contraseña, al ingresar
            escribirás un código de tu teléfono.
          </>
        }
      >
        <MfaSetup onDone={() => void refresh()} secondaryAction={leave} />
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Verificación en dos pasos" intro={`Abre tu aplicación autenticadora y escribe el código de 6 dígitos de ${session.user.email}.`}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <CodeField id="mfa-code" value={code} onChange={setCode} error={error} />
        {failure && (
          <p className="notice notice-error" role="alert">
            {failure}
          </p>
        )}
        <p className="help">¿Perdiste el teléfono? Pide a quien gestiona usuarios que restablezca tu verificación en dos pasos.</p>
        <div className="gate-actions">
          {leave}
          <Button type="submit" disabled={saving}>
            Verificar
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}
