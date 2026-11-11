import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  /** Contenido a la derecha del título: un botón o un enlace. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** Bloque de contenido con título, usado en el panel. */
export default function Card({ title, subtitle, action, className = '', children }: Props) {
  return (
    <section className={`card ${className}`}>
      <header className="card-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
