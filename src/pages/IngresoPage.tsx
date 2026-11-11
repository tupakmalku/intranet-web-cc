import { useState, type FormEvent } from 'react'
import AuthShell from '../components/AuthShell.tsx'
import Button from '../components/ui/Button.tsx'
import Field from '../components/ui/Field.tsx'
import Icon from '../components/ui/Icon.tsx'
import PasswordField from '../components/ui/PasswordField.tsx'
import { useAuth } from '../context/auth.ts'
import { greeting } from '../lib/dates.ts'
import { useSubmit } from '../lib/useSubmit.ts'
import { isEmail } from '../lib/validation.ts'

/** Pantalla de ingreso: el formulario dentro del marco común del ingreso (AuthShell). */
export default function IngresoPage() {
  const { signIn, notice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { saving, failure, submit } = useSubmit()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (!isEmail(email.trim())) found.email = 'Escribe tu correo, como nombre@institucion.ec.'
    if (!password) found.password = 'Escribe tu contraseña.'
    setErrors(found)
    if (Object.keys(found).length) return
    await submit(() => signIn(email.trim(), password))
  }

  return (
    <AuthShell title={greeting()}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        {/* La sesión anterior se cerró sola: por inactividad o por su duración máxima. */}
        {notice && !failure && (
          <p className="notice notice-info" role="status">
            <Icon name="clock" size={18} />
            {notice}
          </p>
        )}
        <Field
          id="login-email"
          label="Correo"
          icon="mail"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <PasswordField
          id="login-password"
          label="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {failure && (
          <p className="notice notice-error" role="alert">
            <Icon name="alert" size={18} />
            {failure}
          </p>
        )}
        <Button type="submit" size="large" fullWidth disabled={saving}>
          {saving ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </AuthShell>
  )
}
