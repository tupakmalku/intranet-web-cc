import { useState } from 'react'
import { backend } from '../backend/index.ts'
import Field from '../components/ui/Field.tsx'
import FormModal from '../components/ui/FormModal.tsx'
import type { DocumentType } from '../domain/types.ts'
import { useSubmit } from '../lib/useSubmit.ts'

interface Props {
  /** El tipo a renombrar. Sin él, se crea uno nuevo al final. */
  type?: DocumentType
  onSaved: () => void
  onClose: () => void
}

/** Formulario para crear o renombrar un tipo de documento: una carpeta de cada proceso. */
export default function TipoDocumentoForm({ type, onSaved, onClose }: Props) {
  const [name, setName] = useState(type?.name ?? '')
  const [error, setError] = useState('')
  const { saving, failure, submit } = useSubmit()

  async function handleSubmit() {
    if (!name.trim()) return setError('Escribe el nombre del tipo.')
    setError('')
    await submit(async () => {
      await backend.documentTypes.save({ id: type?.id, name })
      onSaved()
    })
  }

  return (
    <FormModal
      title={type ? 'Editar tipo de documento' : 'Nuevo tipo de documento'}
      submitLabel="Guardar tipo"
      saving={saving}
      failure={failure}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field
        id="type-name"
        label="Nombre"
        icon="folder"
        placeholder="Manual, Registro, Tomo 1…"
        help="Es el nombre de la carpeta en cada proceso."
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
      />
    </FormModal>
  )
}
