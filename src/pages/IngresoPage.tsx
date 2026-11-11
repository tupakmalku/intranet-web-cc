import { useState, type FormEvent } from 'react'
import { backend } from '../backend/index.ts'
import { brand } from '../brand/index.ts'
import BrandMark from '../components/BrandMark.tsx'
import Button from '../components/ui/Button.tsx'
import Field from '../components/ui/Field.tsx'
import Icon from '../components/ui/Icon.tsx'
import PasswordField from '../components/ui/PasswordField.tsx'
import { useAuth } from '../context/auth.ts'
import { useSubmit } from '../lib/useSubmit.ts'
import { isEmail } from '../lib/validation.ts'

/** Pantalla de ingreso: la identidad de la institución a un lado y el formulario al otro. */
export default function IngresoPage() {
  const { signIn } = useAuth()
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
    <div className="login">
      <aside className="login-brand">
        <BrandMark size={brand.logo ? 200 : 96} on="dark" />
        {/* El logotipo ya lleva el nombre de la institución. */}
        {!brand.logo && <h2>{brand.institution}</h2>}
        <p>{brand.slogan}</p>
        <small>{brand.motto}</small>
      </aside>
      <main className="login-panel">
        <form className="form login-form" onSubmit={handleSubmit} noValidate>
          <h1>{brand.appName}</h1>
          <p>Ingresa con tu correo institucional.</p>
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
          <p className="help">Si olvidaste tu contraseña, pide al oficial de seguridad de la información que la restablezca.</p>
          {backend.demoNotice && <p className="login-demo">{backend.demoNotice}</p>}
        </form>
      </main>
    </div>
  )
}
