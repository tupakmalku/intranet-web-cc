import { useState, type FormEvent, type ReactNode } from 'react'
import { backend } from '../backend/index.ts'
import Button from '../components/ui/Button.tsx'
import Icon from '../components/ui/Icon.tsx'
import PasswordField from '../components/ui/PasswordField.tsx'
import { useSubmit } from '../lib/useSubmit.ts'
import { PASSWORD_HINT, passwordProblem } from '../lib/validation.ts'

interface Props {
  /** Cómo se llama la contraseña que se tiene ahora: "Contraseña temporal" en el primer ingreso. */
  currentLabel?: string
  /** Se llama cuando la contraseña ya cambió. */
  onDone: () => void
  /** Botón secundario junto al de guardar: cancelar o salir. */
  secondaryAction?: ReactNode
}

/**
 * Formulario para cambiar la contraseña propia. Se usa en el primer ingreso,
 * donde es obligatorio, y desde la cabecera en cualquier momento.
 */
export default function CambioClaveForm({ currentLabel = 'Contraseña actual', onDone, secondaryAction }: Props) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeated, setRepeated] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { saving, failure, submit } = useSubmit()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (!current) found.current = 'Escribe la contraseña que tienes ahora.'
    const problem = passwordProblem(next)
    if (problem) found.next = problem
    else if (next === current) found.next = 'La contraseña nueva debe ser distinta de la actual.'
    if (repeated !== next) found.repeated = 'Las contraseñas no coinciden.'
    setErrors(found)
    if (Object.keys(found).length) return

    if (await submit(() => backend.auth.changePassword(current, next))) onDone()
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <PasswordField
        id="password-current"
        label={currentLabel}
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        error={errors.current}
      />
      <PasswordField
        id="password-next"
        label="Contraseña nueva"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        error={errors.next}
        help={PASSWORD_HINT}
      />
      <PasswordField
        id="password-repeated"
        label="Repite la contraseña nueva"
        autoComplete="new-password"
        value={repeated}
        onChange={(e) => setRepeated(e.target.value)}
        error={errors.repeated}
      />
      {failure && (
        <p className="notice notice-error" role="alert">
          <Icon name="alert" size={18} />
          {failure}
        </p>
      )}
      <div className="gate-actions">
        {secondaryAction}
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </div>
    </form>
  )
}
