import type { ReactNode } from 'react'
import Icon, { type IconName } from './Icon.tsx'

/** Mensaje para una pantalla o lista sin contenido, con su ícono en recuadro y una acción opcional. */
export default function EmptyState({
  title,
  icon = 'folder',
  children,
  action,
}: {
  title: string
  icon?: IconName
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-tile" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  )
}
