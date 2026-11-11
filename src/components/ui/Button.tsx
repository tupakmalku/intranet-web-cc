import type { ButtonHTMLAttributes } from 'react'
import Icon, { type IconName } from './Icon.tsx'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'light' | 'text' | 'danger'
  size?: 'normal' | 'small' | 'large'
  icon?: IconName
  /** Ocupa todo el ancho disponible. */
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'normal',
  icon,
  fullWidth,
  className = '',
  type = 'button',
  children,
  ...rest
}: Props) {
  const classes = ['button', `button-${variant}`, size !== 'normal' && `button-${size}`, fullWidth && 'button-full', className]
  return (
    <button type={type} className={classes.filter(Boolean).join(' ')} {...rest}>
      {icon && <Icon name={icon} size={size === 'small' ? 16 : 18} />}
      {children}
    </button>
  )
}
