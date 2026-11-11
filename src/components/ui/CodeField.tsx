import Field from './Field.tsx'

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  error?: string
  label?: string
}

/** Campo para el código de 6 dígitos de una aplicación autenticadora. Acepta solo números y lo completa el sistema si puede. */
export default function CodeField({ id, value, onChange, error, label = 'Código de 6 dígitos' }: Props) {
  return (
    <Field
      id={id}
      label={label}
      icon="lock"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="123456"
      className="code-input"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      error={error}
    />
  )
}
