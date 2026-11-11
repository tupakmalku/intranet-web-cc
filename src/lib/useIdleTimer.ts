import { useEffect, useRef, useState } from 'react'

/* Temporizador de inactividad reutilizable, con fecha límite opcional. */

interface Options {
  /** Milisegundos sin actividad tras los que vence. */
  idleMs: number
  /** Milisegundos de aviso antes de vencer. */
  warningMs: number
  /** Momento (ms) en que vence aunque haya actividad, o undefined si no hay. */
  deadline?: number
  /** No cuenta actividad anterior a este momento (ms), por ejemplo el ingreso. */
  since: number
  /** Clave en localStorage de la última actividad: así todas las pestañas comparten el mismo reloj. */
  storageKey: string
  /** Se llama una vez al vencer. */
  onExpire: (reason: 'idle' | 'deadline') => void
}

export interface IdleTimer {
  /** Está en el período de aviso. */
  warning: boolean
  /** Por qué vencerá: inactividad o fecha límite. */
  reason: 'idle' | 'deadline'
  /** Segundos que faltan para vencer. */
  secondsLeft: number
  /** Cuenta como actividad (por ejemplo, el botón «Seguir conectado»). */
  stayActive: () => void
}

/** Eventos que cuentan como actividad. Mover el ratón no cuenta: puede moverse solo. */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/** Cada cuánto se guarda la actividad, para no escribir en cada tecla. */
const SAVE_EVERY = 5_000

function readStored(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

function writeStored(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Sin almacenamiento (navegación privada): el reloj queda solo en esta pestaña.
  }
}

/**
 * Mide la inactividad del usuario y avisa antes de vencer. Durante el aviso la
 * actividad ya no cuenta: hay que confirmar con `stayActive`. Comprueba el
 * tiempo cada segundo contra la hora real, así funciona aunque el equipo se
 * suspenda o la pestaña quede en segundo plano.
 */
export function useIdleTimer({ idleMs, warningMs, deadline, since, storageKey, onExpire }: Options): IdleTimer {
  const lastActivity = useRef(Math.max(readStored(storageKey), since))
  const lastSaved = useRef(0)
  const expired = useRef(false)
  const onExpireRef = useRef(onExpire)
  const [state, setState] = useState<Omit<IdleTimer, 'stayActive'>>({ warning: false, reason: 'idle', secondsLeft: Math.round(idleMs / 1000) })
  const warningRef = useRef(false)
  const stayActiveRef = useRef(() => {})

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    function touch(force = false) {
      if (warningRef.current && !force) return
      const now = Date.now()
      lastActivity.current = now
      if (force || now - lastSaved.current > SAVE_EVERY) {
        lastSaved.current = now
        writeStored(storageKey, now)
      }
    }
    const onActivity = () => touch()
    // Actividad en otra pestaña.
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) lastActivity.current = Math.max(lastActivity.current, Number(e.newValue))
    }

    function tick() {
      if (expired.current) return
      const now = Date.now()
      lastActivity.current = Math.max(lastActivity.current, readStored(storageKey))
      const idleLeft = lastActivity.current + idleMs - now
      const deadlineLeft = deadline === undefined ? Infinity : deadline - now
      const reason = deadlineLeft < idleLeft ? 'deadline' : 'idle'
      const left = Math.min(idleLeft, deadlineLeft)
      if (left <= 0) {
        expired.current = true
        onExpireRef.current(reason)
        return
      }
      const warning = left <= warningMs
      warningRef.current = warning
      setState({ warning, reason, secondsLeft: Math.ceil(left / 1000) })
    }

    // Al montarse no se cuenta actividad: si el navegador estuvo cerrado más que el tiempo permitido, vence en el acto.
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, onActivity, { passive: true })
    window.addEventListener('storage', onStorage)
    const interval = window.setInterval(tick, 1000)
    tick()
    // Al volver a la pestaña (o despertar el equipo), se comprueba en el acto.
    document.addEventListener('visibilitychange', tick)
    stayActiveRef.current = () => {
      warningRef.current = false
      touch(true)
      tick()
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', tick)
      window.clearInterval(interval)
    }
  }, [idleMs, warningMs, deadline, storageKey])

  return { ...state, stayActive: () => stayActiveRef.current() }
}
