import { useState } from 'react'
import Button from '../components/ui/Button.tsx'
import Icon from '../components/ui/Icon.tsx'
import TextArea from '../components/ui/TextArea.tsx'
import { useSubmit } from '../lib/useSubmit.ts'

interface Props {
  /** Registra la revisión en el backend: un documento de la intranet. */
  review: (approved: boolean, note: string) => Promise<unknown>
  /** Se llama cuando la revisión ya se registró, con el resultado. */
  onReviewed: (approved: boolean) => void
  /** Texto del botón que aprueba. */
  approveLabel?: string
}

/** Formulario de revisión: aprobar u observar con un comentario, obligatorio al observar. */
export default function RevisionForm({ review, onReviewed, approveLabel = 'Aprobar' }: Props) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const { saving, failure, submit } = useSubmit()

  async function decide(approved: boolean) {
    // Quien envió el archivo necesita saber qué corregir.
    if (!approved && !note.trim()) return setError('Explica qué falta o qué hay que corregir.')
    setError('')
    if (await submit(async () => void (await review(approved, note)))) onReviewed(approved)
  }

  return (
    <div className="form">
      <TextArea
        id="review-note"
        label="Comentario de la revisión"
        icon="comment"
        rows={2}
        placeholder="Obligatorio al observar: qué falta o qué hay que corregir."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={error}
      />
      {failure && (
        <p className="notice notice-error" role="alert">
          <Icon name="alert" size={18} />
          {failure}
        </p>
      )}
      <div className="gate-actions">
        <Button variant="danger" onClick={() => decide(false)} disabled={saving}>
          Observar
        </Button>
        <Button icon="check" onClick={() => decide(true)} disabled={saving}>
          {approveLabel}
        </Button>
      </div>
    </div>
  )
}
