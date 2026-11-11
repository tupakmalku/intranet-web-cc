import { useState } from 'react'
import { backend } from '../backend/index.ts'
import { useAuth, useSession } from '../context/auth.ts'
import { useToast } from '../context/toasts.ts'
import MfaSetup from './MfaSetup.tsx'
import Button from './ui/Button.tsx'
import ConfirmDialog from './ui/ConfirmDialog.tsx'
import Icon from './ui/Icon.tsx'
import Modal from './ui/Modal.tsx'

/**
 * Estado de la verificación en dos pasos del usuario en sesión, con los
 * botones para activarla o desactivarla (si la política no la exige).
 */
export default function MfaStatus() {
  const { mfa } = useSession()
  const { refresh } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState<'setup' | 'disable' | null>(null)

  return (
    <div className="mfa-status">
      <Icon name={mfa.enrolled ? 'shield' : 'lock'} />
      <span>
        <strong>Verificación en dos pasos: {mfa.enrolled ? 'activada' : 'desactivada'}</strong>
        <small>
          {mfa.required
            ? 'La política de la institución la exige para tu rol.'
            : mfa.enrolled
              ? 'Al ingresar se pide un código de tu aplicación autenticadora.'
              : 'Actívala para que tu contraseña sola no baste para entrar.'}
        </small>
      </span>
      {!mfa.enrolled && (
        <Button size="small" onClick={() => setOpen('setup')}>
          Activar
        </Button>
      )}
      {mfa.enrolled && !mfa.required && (
        <Button size="small" variant="text" onClick={() => setOpen('disable')}>
          Desactivar
        </Button>
      )}

      {open === 'setup' && (
        <Modal title="Activar la verificación en dos pasos" onClose={() => setOpen(null)}>
          <MfaSetup
            onDone={async () => {
              setOpen(null)
              await refresh()
              toast('Verificación en dos pasos activada')
            }}
            secondaryAction={
              <Button variant="text" onClick={() => setOpen(null)}>
                Cancelar
              </Button>
            }
          />
        </Modal>
      )}
      {open === 'disable' && (
        <ConfirmDialog
          title="Desactivar la verificación en dos pasos"
          confirmLabel="Desactivar"
          danger
          onClose={() => setOpen(null)}
          onConfirm={async () => {
            await backend.auth.disableMfa()
            await refresh()
            toast('Verificación en dos pasos desactivada')
          }}
        >
          Con solo tu contraseña se podrá entrar a tu cuenta. Puedes volver a activarla cuando quieras.
        </ConfirmDialog>
      )}
    </div>
  )
}
