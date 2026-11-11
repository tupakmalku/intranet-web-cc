import Icon from './Icon.tsx'

/**
 * Candado en lugar de una acción que el usuario no puede hacer (por ejemplo,
 * editar a alguien con más permisos). Explica el motivo al pasar el cursor y
 * a los lectores de pantalla.
 */
export default function LockedAction({ label }: { label: string }) {
  return (
    <span className="icon-button locked-action" role="img" aria-label={label} title={label}>
      <Icon name="lock" size={18} />
    </span>
  )
}
