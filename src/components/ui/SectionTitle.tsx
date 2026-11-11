import type { ReactNode } from 'react'
import Icon, { type IconName } from './Icon.tsx'

interface Props {
  title: ReactNode
  /** Ícono en recuadro al final de la línea. */
  icon?: IconName
  /** Texto breve bajo el título. */
  subtitle?: ReactNode
  /** Contenido a la derecha: un botón o un enlace. */
  action?: ReactNode
  /** sm: sobre el panel de marca; md: tarjetas y secciones; lg: bloques destacados. */
  size?: 'sm' | 'md' | 'lg'
  /** Sobre el color principal (texto claro). */
  inverse?: boolean
}

const ICON_SIZE = { sm: 18, md: 20, lg: 26 }

/**
 * Título de sección de toda la aplicación, el mismo de la pantalla de ingreso:
 * en mayúsculas, con una línea que llega hasta el ícono en recuadro (o hasta la
 * acción), como la pieza gráfica de la institución.
 */
export default function SectionTitle({ title, icon, subtitle, action, size = 'md', inverse = false }: Props) {
  return (
    <header className={`section-title section-title-${size}${inverse ? ' is-inverse' : ''}`}>
      <div className="section-title-row">
        <h2>{title}</h2>
        <span className="section-title-rule" aria-hidden="true" />
        {icon && (
          <span className="section-title-tile" aria-hidden="true">
            <Icon name={icon} size={ICON_SIZE[size]} />
          </span>
        )}
        {action}
      </div>
      {subtitle && <p className="section-title-subtitle">{subtitle}</p>}
    </header>
  )
}
