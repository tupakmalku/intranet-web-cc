import { useState, type FormEvent, type ReactNode } from 'react'
import { backend } from '../backend/index.ts'
import { useQuery } from '../lib/useQuery.ts'
import { useSubmit } from '../lib/useSubmit.ts'
import Button from './ui/Button.tsx'
import CodeField from './ui/CodeField.tsx'

interface Props {
  /** Se llama cuando la aplicación quedó configurada (y la sesión verificada). */
  onDone: () => void
  /** Botón secundario junto al de confirmar: cancelar o salir. */
  secondaryAction?: ReactNode
}

/**
 * Configura la verificación en dos pasos: muestra el QR (y la clave, para
 * escribirla a mano) y pide el primer código para confirmar que funciona.
 */
export default function MfaSetup({ onDone, secondaryAction }: Props) {
  const enrollment = useQuery(() => backend.auth.startMfaEnrollment(), [])
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const { saving, failure, submit } = useSubmit()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return setError('Escribe los 6 dígitos que muestra la aplicación.')
    setError('')
    if (await submit(() => backend.auth.confirmMfaEnrollment(enrollment.data!.factorId, code))) onDone()
  }

  if (enrollment.error) return <p className="notice notice-error">{enrollment.error}</p>
  if (!enrollment.data) return <p className="loading">Preparando…</p>
  return (
    <form className="form mfa-setup" onSubmit={handleSubmit} noValidate>
      {/* El QR al lado de los pasos: así todo cabe en pantallas bajas (portátiles de 14"). */}
      <div className="mfa-setup-grid">
        <img className="mfa-qr" src={enrollment.data.qrCode} alt="Código QR para la aplicación autenticadora" width={168} height={168} />
        <div>
          <ol className="mfa-steps">
            <li>Instala una aplicación autenticadora en tu teléfono: Google Authenticator, Microsoft Authenticator u otra similar.</li>
            <li>Agrega una cuenta y escanea el código QR.</li>
            <li>Escribe el código de 6 dígitos que muestra la aplicación.</li>
          </ol>
          <CodeField id="mfa-setup-code" value={code} onChange={setCode} error={error} />
        </div>
      </div>
      <small className="help">
        ¿No puedes escanearlo? Escribe esta clave: <code className="mfa-secret">{enrollment.data.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
      </small>
      {failure && (
        <p className="notice notice-error" role="alert">
          {failure}
        </p>
      )}
      <div className="gate-actions">
        {secondaryAction}
        <Button type="submit" disabled={saving}>
          Activar
        </Button>
      </div>
    </form>
  )
}
