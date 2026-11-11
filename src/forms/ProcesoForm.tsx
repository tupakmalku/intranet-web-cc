import { useState } from 'react'
import { backend } from '../backend/index.ts'
import Field from '../components/ui/Field.tsx'
import FormModal from '../components/ui/FormModal.tsx'
import { childrenOf, levelOf, PROCESS_LEVELS, processLabel } from '../domain/processes.ts'
import type { ProcessNode } from '../domain/types.ts'
import { useSubmit } from '../lib/useSubmit.ts'

interface Props {
  processes: ProcessNode[]
  /** El elemento a editar. Sin él, se crea uno debajo de `parent`. */
  process?: ProcessNode
  /** Elemento del que cuelga el nuevo; null para un macroproceso. */
  parent?: ProcessNode | null
  onSaved: () => void
  onClose: () => void
}

/** Formulario para crear o renombrar un macroproceso, proceso o subproceso del mapa. */
export default function ProcesoForm({ processes, process, parent = null, onSaved, onClose }: Props) {
  const parentId = process ? process.parentId : (parent?.id ?? null)
  const level = parentId ? levelOf(processes, parentId) + 1 : 0
  const levelName = PROCESS_LEVELS[level as 0 | 1 | 2].name
  // Código sugerido: el siguiente de su nivel ("2.4" después de "2.3").
  const suggested = `${parent?.code ? `${parent.code}.` : ''}${childrenOf(processes, parentId).length + 1}`
  const [code, setCode] = useState(process?.code ?? suggested)
  const [name, setName] = useState(process?.name ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { saving, failure, submit } = useSubmit()

  async function handleSubmit() {
    const found: Record<string, string> = {}
    if (!name.trim()) found.name = 'Escribe el nombre.'
    setErrors(found)
    if (Object.keys(found).length) return
    await submit(async () => {
      await backend.processes.save({ id: process?.id, parentId, code, name })
      onSaved()
    })
  }

  return (
    <FormModal
      title={process ? `Editar ${levelName.toLowerCase()}` : `Nuevo ${levelName.toLowerCase()}`}
      description={parent && !process ? `Dentro de ${processLabel(parent)}` : undefined}
      submitLabel={`Guardar ${levelName.toLowerCase()}`}
      saving={saving}
      failure={failure}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field
        id="process-code"
        label="Numeración"
        icon="tag"
        placeholder="2.1"
        help="Como aparece en el mapa de procesos aprobado."
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <Field
        id="process-name"
        label="Nombre"
        icon="folder"
        placeholder={level === 0 ? 'Macroprocesos de apoyo' : 'Gestión de talento humano'}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
    </FormModal>
  )
}
