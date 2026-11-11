import { useState, type FormEvent } from 'react'
import { backend } from '../backend/index.ts'
import { brand } from '../brand/index.ts'
import BrandMark from '../components/BrandMark.tsx'
import Button from '../components/ui/Button.tsx'
import Field from '../components/ui/Field.tsx'
import Icon from '../components/ui/Icon.tsx'
import PasswordField from '../components/ui/PasswordField.tsx'
import InstitutionSummary from '../components/institution/InstitutionSummary.tsx'
import { useAuth } from '../context/auth.ts'
import { hasInstitutionContent } from '../domain/institution.ts'
import { greeting } from '../lib/dates.ts'
import { useQuery } from '../lib/useQuery.ts'
import { useSubmit } from '../lib/useSubmit.ts'
import { isEmail } from '../lib/validation.ts'

/** Pantalla de ingreso: la identidad de la institución a un lado y el formulario al otro. */
export default function IngresoPage() {
  const { signIn, notice } = useAuth()
  // Identidad institucional (pública): misión, visión, valores y política de calidad, bajo el eslogan.
  const institution = useQuery(() => backend.institution.get(), [])
  const showInstitution = !!institution.data && hasInstitutionContent(institution.data) && institution.data.loginHighlight !== 'none'
  const words = brand.slogan.trim().split(/\s+/)
  const sloganEnd = words.pop() ?? ''
  const sloganStart = words.join(' ')
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
      {/* La identidad: el eslogan como titular, el isotipo de fondo y la misión, visión, valores y política. */}
      <aside className="login-brand">
        {brand.logo?.onDark && <img className="login-watermark" src={brand.logo.onDark} alt="" aria-hidden="true" />}
        <header className="login-hero">
          <span className="login-eyebrow">{brand.institution}</span>
          <h2>
            {/* La última palabra del eslogan, en el color de acento. */}
            {sloganStart} <span>{sloganEnd}</span>
          </h2>
        </header>
        {showInstitution ? <InstitutionSummary profile={institution.data!} /> : <p className="login-motto">{brand.motto}</p>}
      </aside>
      <main className="login-panel">
        <form className="form login-form" onSubmit={handleSubmit} noValidate>
          {/* El logotipo a color, sobre el nombre de la aplicación. */}
          <div className="login-logo">
            <BrandMark size={brand.logo ? 148 : 56} on="light" />
          </div>
          <span className="login-greeting">{greeting()}</span>
          <h1>{brand.appName}</h1>
          <p>Ingresa con tu correo institucional.</p>
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
          <p className="help">Si olvidaste tu contraseña, pide al oficial de seguridad de la información que la restablezca.</p>
          {backend.demoNotice && <p className="login-demo">{backend.demoNotice}</p>}
        </form>
      </main>
    </div>
  )
}
