import type { ReactNode } from 'react'
import { backend } from '../backend/index.ts'
import { brand } from '../brand/index.ts'
import { hasInstitutionContent } from '../domain/institution.ts'
import { useQuery } from '../lib/useQuery.ts'
import InstitutionSummary from './institution/InstitutionSummary.tsx'
import SloganMark from './SloganMark.tsx'

interface Props {
  /** Título grande del formulario: el saludo, «Crea tu contraseña», etc. */
  title: ReactNode
  /** Texto breve bajo el título. */
  intro?: ReactNode
  children: ReactNode
}

/**
 * Marco de todas las pantallas del ingreso (ingresar, crear la contraseña,
 * verificación en dos pasos): la identidad de la institución a un lado y el
 * formulario al otro, para que el paso de una a otra no se note.
 */
export default function AuthShell({ title, intro, children }: Props) {
  // Identidad institucional (pública): misión, visión, valores y política de calidad.
  const institution = useQuery(() => backend.institution.get(), [])
  const profile = institution.data
  const showInstitution = !!profile && hasInstitutionContent(profile) && profile.loginHighlight !== 'none'

  return (
    <div className="login">
      <aside className="login-brand">
        {brand.logo?.onDark && <img className="login-watermark" src={brand.logo.onDark} alt="" aria-hidden="true" />}
        <header className="login-hero">
          <p className="login-app-name">{brand.appName}</p>
          <span className="login-eyebrow">{brand.institution}</span>
        </header>
        {showInstitution ? <InstitutionSummary profile={profile} /> : <p className="login-motto">{brand.motto}</p>}
        {/* El eslogan cierra el panel, después de los valores. */}
        <SloganMark className="login-slogan" />
      </aside>
      <main className="login-panel">
        <div className="login-form">
          <h1 className="login-title">{title}</h1>
          {intro && <p className="login-intro">{intro}</p>}
          {children}
        </div>
      </main>
    </div>
  )
}
