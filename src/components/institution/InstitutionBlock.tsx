import type { ReactNode } from 'react'
import type { IconName } from '../ui/Icon.tsx'
import SectionTitle from '../ui/SectionTitle.tsx'

interface Props {
  title: string
  icon: IconName
  /** Ocupa todo el ancho de la rejilla. */
  wide?: boolean
  /** Compacto y sobre el color principal: para la pantalla de ingreso. */
  variant?: 'page' | 'login'
  children: ReactNode
}

/**
 * Bloque de la identidad institucional: el título de sección (SectionTitle)
 * con su ícono y el contenido debajo. Sigue el estilo de la pieza gráfica de
 * misión, visión y valores de la institución.
 */
export default function InstitutionBlock({ title, icon, wide, variant = 'page', children }: Props) {
  const login = variant === 'login'
  return (
    <section className={`institution-block institution-block-${variant}${wide ? ' is-wide' : ''}`}>
      <SectionTitle title={title} icon={icon} size={login ? 'sm' : 'lg'} inverse={login} />
      <div className="institution-body">{children}</div>
    </section>
  )
}
