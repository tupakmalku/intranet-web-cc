import { useEffect, useId, useRef, type ReactNode } from 'react'
import Icon from './Icon.tsx'

interface Props {
  title: string
  description?: string
  /** Se llama al pulsar cerrar o la tecla Esc. Quien lo usa decide si cierra. */
  onClose: () => void
  size?: 'normal' | 'wide' | 'viewer'
  /** Botones de acción, fijos al pie. */
  footer?: ReactNode
  children: ReactNode
}

/** Ventana modal sobre <dialog>: atrapa el foco, cierra con Esc y bloquea el fondo. */
export default function Modal({ title, description, onClose, size = 'normal', footer, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = dialog.current!
    if (!d.open) d.showModal()
    return () => d.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Esc en un modal abierto encima de este (un formulario sobre el detalle) no lo cierra.
        if (e.target !== e.currentTarget) return
        e.preventDefault()
        onClose()
      }}
    >
      <header className="modal-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
          <Icon name="close" />
        </button>
      </header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </dialog>
  )
}
