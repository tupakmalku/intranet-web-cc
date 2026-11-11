import type { ReactNode } from 'react'

/** Mensaje para una pantalla o lista sin contenido, con una acción opcional. */
export default function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  )
}
