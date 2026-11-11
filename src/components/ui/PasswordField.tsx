import { useState, type ComponentProps } from 'react'
import Field from './Field.tsx'
import Icon from './Icon.tsx'

/** Campo de contraseña con un botón para verla mientras se escribe. */
export default function PasswordField(props: Omit<ComponentProps<typeof Field>, 'type' | 'action' | 'icon'>) {
  const [visible, setVisible] = useState(false)
  return (
    <Field
      {...props}
      icon="lock"
      type={visible ? 'text' : 'password'}
      action={
        <button
          type="button"
          className="input-action"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
        >
          <Icon name="eye" />
        </button>
      }
    />
  )
}
