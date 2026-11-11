import type { InputHTMLAttributes, ReactNode } from 'react'
import Icon, { type IconName } from './Icon.tsx'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  icon?: IconName
  error?: string
  /** Texto de ayuda bajo el campo. Lo reemplaza el error cuando lo hay. */
  help?: string
  /** Contenido al final del campo, por ejemplo el botón de mostrar contraseña. */
  action?: ReactNode
}

/**
 * Campo de texto con etiqueta, icono y mensaje de error. La recomendación de
 * llenado va dentro del campo, con `placeholder`, para no ocupar otra línea.
 */
export default function Field({ id, label, icon, error, help, action, ...inputProps }: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input-box ${error ? 'has-error' : ''}`}>
        {icon && <Icon name={icon} />}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
          {...inputProps}
        />
        {action}
      </div>
      {error ? (
        <p className="error" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        help && (
          <p className="help" id={`${id}-help`}>
            {help}
          </p>
        )
      )}
    </div>
  )
}
