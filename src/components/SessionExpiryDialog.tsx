import Button from './ui/Button.tsx'
import Icon from './ui/Icon.tsx'
import Modal from './ui/Modal.tsx'

interface Props {
  /** Segundos que faltan para el cierre. */
  secondsLeft: number
  /** Inactividad: se puede seguir conectado. Duración máxima: solo queda volver a ingresar. */
  reason: 'idle' | 'deadline'
  onStay: () => void
  onLeave: () => void
}

/** "1:05" o "45 segundos". */
const countdown = (seconds: number) =>
  seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} minutos` : `${seconds} segundos`

/** Aviso de que la sesión está por cerrarse, con cuenta regresiva. */
export default function SessionExpiryDialog({ secondsLeft, reason, onStay, onLeave }: Props) {
  const idle = reason === 'idle'
  return (
    <Modal
      title={idle ? '¿Sigues ahí?' : 'Tu sesión está por terminar'}
      onClose={idle ? onStay : onLeave}
      footer={
        <>
          <Button variant="text" onClick={onLeave}>
            Salir ahora
          </Button>
          {idle && <Button onClick={onStay}>Seguir conectado</Button>}
        </>
      }
    >
      <div className="session-expiry" role="alert" aria-live="assertive">
        <Icon name="clock" size={32} />
        <p>
          {idle ? 'Por seguridad, tu sesión se cerrará por inactividad en ' : 'Tu sesión llegó a su duración máxima y se cerrará en '}
          <strong>{countdown(secondsLeft)}</strong>.
        </p>
        {!idle && <p className="help">Guarda lo que estés haciendo; después podrás volver a ingresar.</p>}
      </div>
    </Modal>
  )
}
