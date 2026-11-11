import type { InputHTMLAttributes, ReactNode } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  /** Texto secundario bajo la etiqueta. */
  detail?: string
}

/** Casilla de verificación con su etiqueta. */
export default function Checkbox({ label, detail, ...inputProps }: Props) {
  return (
    <label className="checkbox">
      <input type="checkbox" {...inputProps} />
      <span>
        {label}
        {detail && <small>{detail}</small>}
      </span>
    </label>
  )
}
