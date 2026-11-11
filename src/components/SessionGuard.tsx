import { sessionSettings } from '../brand/index.ts'
import { useAuth } from '../context/auth.ts'
import { useIdleTimer } from '../lib/useIdleTimer.ts'
import SessionExpiryDialog from './SessionExpiryDialog.tsx'

/** Clave en localStorage de la última actividad, compartida por todas las pestañas. */
const ACTIVITY_KEY = 'intranet.lastActivity'

/**
 * Cierra la sesión tras un tiempo sin actividad o al cumplir su duración
 * máxima (los tiempos son de la institución: src/brand, clave `session`), con
 * un aviso previo. Se monta mientras haya una sesión abierta.
 */
export default function SessionGuard({ startedAt }: { startedAt: string }) {
  const { signOut } = useAuth()
  const { idleMinutes, maxHours, warningSeconds } = sessionSettings()
  const started = new Date(startedAt).getTime()
  const timer = useIdleTimer({
    idleMs: idleMinutes * 60_000,
    warningMs: warningSeconds * 1000,
    deadline: started + maxHours * 3_600_000,
    since: started,
    storageKey: ACTIVITY_KEY,
    onExpire: (reason) => void signOut(reason === 'idle' ? 'idle' : 'expired'),
  })

  if (!timer.warning) return null
  return (
    <SessionExpiryDialog
      secondsLeft={timer.secondsLeft}
      reason={timer.reason}
      onStay={timer.stayActive}
      onLeave={() => void signOut()}
    />
  )
}
