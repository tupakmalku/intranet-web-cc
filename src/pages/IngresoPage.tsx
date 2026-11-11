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
import { useQuery } from '../lib/useQuery.ts'
import { useSubmit } from '../lib/useSubmit.ts'
import { isEmail } from '../lib/validation.ts'

/** Pantalla de ingreso: la identidad de la institución a un lado y el formulario al otro. */
export default function IngresoPage() {
  const { signIn, notice } = useAuth()
  // Identidad institucional (pública): misión, visión, valores y política de calidad, bajo el eslogan.
  const institution = useQuery(() => backend.institution.get(), [])
  // Con todo el contenido, el panel de marca se compacta: logotipo más chico y el texto alineado a la izquierda.
  const full = institution.data?.loginHighlight === 'all' && hasInstitutionContent(institution.data)
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
      <aside className={`login-brand${full ? ' login-brand-full' : ''}`}>
        <BrandMark size={brand.logo ? (full ? 120 : 200) : 96} on="dark" />
        {/* El logotipo ya lleva el nombre de la institución. */}
        {!brand.logo && <h2>{brand.institution}</h2>}
        <p>{brand.slogan}</p>
        {institution.data && hasInstitutionContent(institution.data) && institution.data.loginHighlight !== 'none' ? (
          <InstitutionSummary profile={institution.data} />
        ) : (
          <small>{brand.motto}</small>
        )}
      </aside>
      <main className="login-panel">
        <form className="form login-form" onSubmit={handleSubmit} noValidate>
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
