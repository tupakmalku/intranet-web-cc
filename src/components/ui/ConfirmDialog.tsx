import type { ReactNode } from 'react'
import { useSubmit } from '../../lib/useSubmit.ts'
import Button from './Button.tsx'
import Icon from './Icon.tsx'
import Modal from './Modal.tsx'

interface Props {
  title: string
  /** Qué va a pasar, con sus consecuencias. */
  children: ReactNode
  /** Texto del botón que confirma: nombra la acción ("Eliminar documento"). */
  confirmLabel: string
  /** La acción es destructiva y el botón se muestra en rojo. */
  danger?: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}

/** Pide confirmación antes de una acción que no se puede deshacer. Se cierra sola si la acción termina bien. */
export default function ConfirmDialog({ title, children, confirmLabel, danger = false, onConfirm, onClose }: Props) {
  const { saving, failure, submit } = useSubmit()

  async function confirm() {
    if (await submit(onConfirm)) onClose()
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={confirm} disabled={saving}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="form">
        <p>{children}</p>
        {failure && (
          <p className="notice notice-error" role="alert">
            <Icon name="alert" size={18} />
            {failure}
          </p>
        )}
      </div>
    </Modal>
  )
}
