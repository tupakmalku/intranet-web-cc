import { useState, type FormEvent } from 'react'
import AuthShell from '../components/AuthShell.tsx'
import Button from '../components/ui/Button.tsx'
import Checkbox from '../components/ui/Checkbox.tsx'
import Field from '../components/ui/Field.tsx'
import Icon from '../components/ui/Icon.tsx'
import PasswordField from '../components/ui/PasswordField.tsx'
import { useAuth } from '../context/auth.ts'
import { greeting, longDate } from '../lib/dates.ts'
import { useSubmit } from '../lib/useSubmit.ts'
import { isEmail } from '../lib/validation.ts'

/** Clave en localStorage del correo recordado. Solo el correo: la contraseña nunca se guarda. */
const REMEMBERED_EMAIL_KEY = 'intranet.login.email'

function readRememberedEmail(): string {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveRememberedEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY)
  } catch {
    // Sin almacenamiento (ventana privada, datos bloqueados): simplemente no se recuerda.
  }
}

/** Pantalla de ingreso: el formulario dentro del marco común del ingreso (AuthShell). */
export default function IngresoPage() {
  const { signIn, notice } = useAuth()
  const [rememberedEmail] = useState(readRememberedEmail)
  const [email, setEmail] = useState(rememberedEmail)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(!!rememberedEmail)
  const [showHelp, setShowHelp] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { saving, failure, submit } = useSubmit()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (!isEmail(email.trim())) found.email = 'Escribe tu correo, como nombre@institucion.ec.'
    if (!password) found.password = 'Escribe tu contraseña.'
    setErrors(found)
    if (Object.keys(found).length) return
    saveRememberedEmail(remember ? email.trim() : null)
    await submit(() => signIn(email.trim(), password))
  }

  return (
    <AuthShell title={greeting()} eyebrow={longDate()}>
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
          autoFocus={!rememberedEmail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <PasswordField
          id="login-password"
          label="Contraseña"
          autoComplete="current-password"
          autoFocus={!!rememberedEmail}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <div className="login-remember">
          <Checkbox label="Recordar mi correo" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        </div>
        {failure && (
          <p className="notice notice-error" role="alert">
            <Icon name="alert" size={18} />
            {failure}
          </p>
        )}
        <Button type="submit" size="large" fullWidth disabled={saving}>
          {saving ? 'Ingresando…' : 'Ingresar'}
        </Button>
        <Button
          variant="text"
          className="login-help-toggle"
          aria-expanded={showHelp}
          aria-controls="login-help"
          onClick={() => setShowHelp((open) => !open)}
        >
          ¿Problemas para ingresar?
        </Button>
        {showHelp && (
          <p id="login-help" className="help login-help">
            Pide al oficial de seguridad de la información que restablezca tu contraseña.
          </p>
        )}
      </form>
    </AuthShell>
  )
}
