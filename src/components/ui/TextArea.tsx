import type { TextareaHTMLAttributes } from 'react'
import Icon, { type IconName } from './Icon.tsx'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string
  label: string
  icon?: IconName
  error?: string
}

/** Campo de texto de varias líneas. Mismo aspecto que Field, con la recomendación dentro. */
export default function TextArea({ id, label, icon, error, rows = 3, ...rest }: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input-box input-box-multiline ${error ? 'has-error' : ''}`}>
        {icon && <Icon name={icon} />}
        <textarea id={id} rows={rows} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...rest} />
      </div>
      {error && (
        <p className="error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}
