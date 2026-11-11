import type { ReactNode } from 'react'
import Icon, { type IconName } from '../ui/Icon.tsx'

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
 * Bloque de la identidad institucional: título en mayúsculas con una línea
 * que llega hasta el ícono en recuadro, y el contenido debajo. Sigue el estilo
 * de la pieza gráfica de misión, visión y valores de la institución.
 */
export default function InstitutionBlock({ title, icon, wide, variant = 'page', children }: Props) {
  return (
    <section className={`institution-block institution-block-${variant}${wide ? ' is-wide' : ''}`}>
      <header>
        <h2>{title}</h2>
        <span className="institution-rule" aria-hidden="true" />
        <span className="institution-tile" aria-hidden="true">
          <Icon name={icon} size={variant === 'login' ? 18 : 26} />
        </span>
      </header>
      <div className="institution-body">{children}</div>
    </section>
  )
}
