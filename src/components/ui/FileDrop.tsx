import { useState } from 'react'
import { DOCUMENT_FILES, formatSize, type FileRules } from '../../lib/files.ts'
import Icon from './Icon.tsx'

interface Props {
  id: string
  file: File | null
  onChange: (file: File | null) => void
  error?: string
  /** Tipos y tamaño aceptados. Por defecto, los de un documento de la intranet. */
  rules?: FileRules
}

/** Zona para elegir un archivo, con un clic o arrastrándolo encima. */
export default function FileDrop({ id, file, onChange, error, rules = DOCUMENT_FILES }: Props) {
  const [over, setOver] = useState(false)

  return (
    <div className="field">
      <label
        htmlFor={id}
        className={`file-drop ${over ? 'is-over' : ''} ${error ? 'has-error' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          onChange(e.dataTransfer.files[0] ?? null)
        }}
      >
        <Icon name="upload" size={24} />
        {file ? (
          <>
            <strong>{file.name}</strong>
            <small>{formatSize(file.size)}. Pulsa para elegir otro.</small>
          </>
        ) : (
          <>
            <strong>Elige un archivo o arrástralo aquí</strong>
            <small>{rules.hint}</small>
          </>
        )}
        <input
          id={id}
          className="sr-only"
          type="file"
          accept={rules.accept}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            onChange(e.target.files?.[0] ?? null)
            // Permite volver a elegir el mismo archivo después de quitarlo.
            e.target.value = ''
          }}
        />
      </label>
      {error && (
        <p className="error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}
