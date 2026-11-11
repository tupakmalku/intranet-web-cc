import type { User } from '../domain/types.ts'
import { usePhotoUrl } from '../lib/usePhotoUrl.ts'

/** Iniciales del nombre y el primer apellido: "Andrea Admin" → "AA". */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')

interface Props {
  user: Pick<User, 'id' | 'fullName' | 'photo'>
  /** Lado en píxeles. */
  size?: number
  className?: string
  /** Dirección de una foto que todavía no se guarda (vista previa al elegirla). Null: sin foto. */
  preview?: string | null
}

/** Foto de perfil redonda; sin foto, las iniciales sobre el color de la marca. */
export default function Avatar({ user, size = 40, className = '', preview }: Props) {
  const stored = usePhotoUrl(user)
  const url = preview === undefined ? stored : preview
  return (
    <span className={`user-avatar ${className}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {url ? <img src={url} alt="" /> : initials(user.fullName)}
    </span>
  )
}
