import { useEffect, useId, useRef, useState } from 'react'
import type { User } from '../domain/types.ts'
import { PHOTO_ACCEPT, preparePhoto } from '../lib/images.ts'
import Avatar from './Avatar.tsx'
import Icon from './ui/Icon.tsx'

interface Props {
  /** El usuario dueño de la foto (para la foto actual y las iniciales). */
  user: Pick<User, 'id' | 'fullName' | 'photo'>
  /** Undefined: sin cambios. Blob: foto nueva. Null: quitarla. */
  value: Blob | null | undefined
  onChange: (value: Blob | null | undefined) => void
}

/** Foto de perfil: vista previa y botones para elegir otra o quitarla. La imagen se recorta y comprime al elegirla. */
export default function PhotoField({ user, value, onChange }: Props) {
  const inputId = useId()
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  // La dirección de la vista previa se libera al cambiarla y al cerrar el formulario.
  const previewRef = useRef<string | null>(null)
  useEffect(() => () => void (previewRef.current && URL.revokeObjectURL(previewRef.current)), [])

  async function choose(file: File | undefined) {
    setError('')
    if (!file) return
    try {
      const photo = await preparePhoto(file)
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
      previewRef.current = URL.createObjectURL(photo)
      setPreview(previewRef.current)
      onChange(photo)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo leer la imagen.')
    }
  }

  const hasPhoto = value === undefined ? !!user.photo : !!value
  return (
    <div className="field photo-field">
      <Avatar user={user} size={88} preview={value === undefined ? undefined : value ? preview : null} />
      <div className="photo-field-actions">
        <span className="photo-field-label">Foto de perfil</span>
        <div className="photo-field-buttons">
          <label htmlFor={inputId} className="button button-secondary button-small">
            <Icon name="camera" size={16} />
            {hasPhoto ? 'Cambiar foto' : 'Subir foto'}
          </label>
          <input
            id={inputId}
            type="file"
            accept={PHOTO_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              void choose(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {hasPhoto && (
            <button type="button" className="button button-text button-small" onClick={() => onChange(user.photo ? null : undefined)}>
              Quitar
            </button>
          )}
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : (
          <p className="help">JPG, PNG o WebP. Se recorta en cuadrado.</p>
        )}
      </div>
    </div>
  )
}
