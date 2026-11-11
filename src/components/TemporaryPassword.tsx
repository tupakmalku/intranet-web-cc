import { useRef, useState } from 'react'
import Button from './ui/Button.tsx'
import Modal from './ui/Modal.tsx'

interface Props {
  /** A quién pertenece la contraseña. */
  userName: string
  password: string
  onClose: () => void
}

/**
 * Muestra una contraseña temporal recién generada, para entregársela al
 * usuario. Solo se ve esta vez: no queda guardada en ningún lugar legible.
 */
export default function TemporaryPassword({ userName, password, onClose }: Props) {
  const [copied, setCopied] = useState<'yes' | 'manual' | null>(null)
  const code = useRef<HTMLElement>(null)

  // El portapapeles solo existe en contextos seguros (HTTPS o localhost). Si no
  // está, por ejemplo al abrir la aplicación por la IP de la red, se selecciona
  // la contraseña para copiarla a mano.
  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied('yes')
    } catch {
      if (code.current) window.getSelection()?.selectAllChildren(code.current)
      setCopied('manual')
    }
  }

  return (
    <Modal
      title="Contraseña temporal"
      description={`Entrégasela a ${userName} por un medio seguro.`}
      onClose={onClose}
      footer={<Button onClick={onClose}>Listo, ya la entregué</Button>}
    >
      <div className="form">
        <div className="secret">
          <code ref={code}>{password}</code>
          <Button variant="secondary" size="small" onClick={copy}>
            {copied === 'yes' ? 'Copiada' : 'Copiar'}
          </Button>
        </div>
        {copied === 'manual' && <p className="help">No se pudo copiar sola: ya está seleccionada, cópiala manteniéndola presionada.</p>}
        <p className="help">
          No se volverá a mostrar. Al ingresar con ella, {userName} deberá cambiarla por una propia antes de usar la aplicación.
        </p>
      </div>
    </Modal>
  )
}
