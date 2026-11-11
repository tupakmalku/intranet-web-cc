import type { ReactNode } from 'react'
import type { IconName } from './Icon.tsx'
import SectionTitle from './SectionTitle.tsx'

interface Props {
  title: string
  subtitle?: string
  icon?: IconName
  /** Contenido a la derecha del título: un botón o un enlace. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** Bloque de contenido con el título de sección de la aplicación. */
export default function Card({ title, subtitle, icon, action, className = '', children }: Props) {
  return (
    <section className={`card ${className}`}>
      <SectionTitle title={title} subtitle={subtitle} icon={icon} action={action} />
      {children}
    </section>
  )
}
