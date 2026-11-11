import { useId, type FormEvent, type ReactNode } from 'react'
import Button from './Button.tsx'
import Icon from './Icon.tsx'
import Modal from './Modal.tsx'

interface Props {
  title: string
  description?: string
  size?: 'normal' | 'wide'
  /** Texto del botón que guarda: nombra la acción ("Guardar documento"). */
  submitLabel: string
  /** Se está guardando: el botón queda deshabilitado. */
  saving: boolean
  /** Mensaje del backend si no se pudo guardar. */
  failure?: string
  onSubmit: () => void
  onClose: () => void
  children: ReactNode
}

/** Modal con un formulario: los campos en el cuerpo y los botones de guardar y cancelar fijos al pie. */
export default function FormModal({ title, description, size, submitLabel, saving, failure, onSubmit, onClose, children }: Props) {
  const formId = useId()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Un formulario dentro de otro modal no debe enviar también el de abajo.
    e.stopPropagation()
    onSubmit()
  }

  return (
    <Modal
      title={title}
      description={description}
      size={size}
      onClose={onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? 'Guardando…' : submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} className="form" onSubmit={handleSubmit} noValidate>
        {children}
        {failure && (
          <p className="notice notice-error" role="alert">
            <Icon name="alert" size={18} />
            {failure}
          </p>
        )}
      </form>
    </Modal>
  )
}
