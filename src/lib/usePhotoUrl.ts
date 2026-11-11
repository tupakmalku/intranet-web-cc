import { useEffect, useState } from 'react'
import { backend } from '../backend/index.ts'
import type { User } from '../domain/types.ts'

/** Dirección de la foto de perfil de un usuario, o null mientras carga o si no tiene. */
export function usePhotoUrl(user: Pick<User, 'id' | 'photo'>): string | null {
  const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null)

  useEffect(() => {
    if (!user.photo) return
    let cancelled = false
    const key = user.photo
    backend.users.photoUrl({ id: user.id, photo: key }).then(
      (url) => !cancelled && setLoaded({ key, url }),
      () => !cancelled && setLoaded({ key, url: null }),
    )
    return () => {
      cancelled = true
    }
  }, [user.id, user.photo])

  // Si la foto cambió, la dirección cargada antes ya no corresponde.
  return user.photo && loaded?.key === user.photo ? loaded.url : null
}
