import { useState } from 'react'
import { backend } from '../backend/index.ts'
import FileDrop from '../components/ui/FileDrop.tsx'
import type { IntranetCatalog } from '../components/intranet/catalog.ts'
import Checkbox from '../components/ui/Checkbox.tsx'
import Field from '../components/ui/Field.tsx'
import FormModal from '../components/ui/FormModal.tsx'
import SegmentedControl from '../components/ui/SegmentedControl.tsx'
import Select from '../components/ui/Select.tsx'
import TextArea from '../components/ui/TextArea.tsx'
import { CLASSIFICATIONS } from '../domain/labels.ts'
import { processOptions } from '../domain/processes.ts'
import type { Classification, IntranetDocument } from '../domain/types.ts'
import { DOCUMENT_FILES } from '../lib/files.ts'
import { useSubmit } from '../lib/useSubmit.ts'

interface Props {
  /** El documento a corregir. Sin él, se sube uno nuevo. */
  document?: IntranetDocument
  /** Documento publicado del que se sube una versión nueva: se copian sus datos y al aprobarse lo reemplaza. */
  replaces?: IntranetDocument
  catalog: IntranetCatalog
  /** Proceso y tipo con que empieza un documento nuevo: los de la carpeta desde la que se publica. */
  initialProcessId?: string | null
  initialTypeId?: string | null
  onSaved: (document: IntranetDocument) => void
  onClose: () => void
}

const CLASSIFICATION_OPTIONS = Object.entries(CLASSIFICATIONS).map(([value, c]) => ({ value, text: c.name }))

/**
 * Formulario para subir un documento a la intranet, corregirlo o subir su
 * versión nueva. El documento va en un proceso del mapa y en una carpeta (su
 * tipo). Quien lo sube elige la clasificación, que decide quién lo lee y quién
 * lo descarga. Siempre queda por aprobar.
 */
export default function DocumentoForm({ document, replaces, catalog, initialProcessId, initialTypeId, onSaved, onClose }: Props) {
  const source = document ?? replaces
  const processChoices = processOptions(catalog.processes)
  const [code, setCode] = useState(source?.code ?? '')
  const [version, setVersion] = useState(document?.version ?? '')
  const [title, setTitle] = useState(source?.title ?? '')
  const [processId, setProcessId] = useState(
    source?.processId ?? (processChoices.some((o) => o.value === initialProcessId) ? initialProcessId! : ''),
  )
  const [typeId, setTypeId] = useState(source?.typeId ?? initialTypeId ?? '')
  const [description, setDescription] = useState(source?.description ?? '')
  const [classification, setClassification] = useState<Classification | ''>(source?.classification ?? '')
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>(source?.allowedRoleIds ?? [])
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { saving, failure, submit } = useSubmit()

  function chooseFile(chosen: File | null) {
    setFile(chosen)
    setErrors({ ...errors, file: chosen ? (DOCUMENT_FILES.problem(chosen) ?? '') : '' })
  }

  function toggleRole(roleId: string, allowed: boolean) {
    setAllowedRoleIds(allowed ? [...allowedRoleIds, roleId] : allowedRoleIds.filter((id) => id !== roleId))
  }

  async function handleSubmit() {
    const found: Record<string, string> = {}
    if (!code.trim()) found.code = 'Escribe el código del documento.'
    if (!version.trim()) found.version = 'Escribe la versión.'
    else if (replaces && version.trim().toLowerCase() === replaces.version.toLowerCase()) found.version = 'La versión nueva debe tener otro número.'
    if (!title.trim()) found.title = 'Escribe el título.'
    if (!processId) found.process = 'Elige el proceso al que pertenece.'
    if (!typeId) found.type = 'Elige el tipo de documento.'
    if (!classification) found.classification = 'Elige quién puede leerlo.'
    if (classification === 'restricted' && !allowedRoleIds.length) found.roles = 'Marca al menos un rol.'
    if (!file && !document) found.file = 'Elige el archivo del documento.'
    else if (file && DOCUMENT_FILES.problem(file)) found.file = DOCUMENT_FILES.problem(file)!
    setErrors(found)
    if (Object.keys(found).length || !classification) return

    await submit(async () => {
      const saved = await backend.documents.save(
        {
          id: document?.id,
          replacesId: replaces?.id ?? null,
          code,
          version,
          title,
          processId,
          typeId,
          description,
          classification,
          allowedRoleIds: classification === 'restricted' ? allowedRoleIds : [],
        },
        file,
      )
      onSaved(saved)
    })
  }

  return (
    <FormModal
      title={document ? 'Corregir documento' : replaces ? 'Nueva versión' : 'Publicar documento'}
      description={
        replaces ? `Reemplazará a la versión ${replaces.version} cuando se apruebe.` : 'Se publica en la intranet cuando lo aprueba el aprobador de publicaciones.'
      }
      size="wide"
      submitLabel="Enviar a aprobación"
      saving={saving}
      failure={failure}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Select
        id="document-process"
        label="Proceso"
        icon="folder"
        options={processChoices}
        emptyLabel="Elige el proceso o subproceso"
        value={processId}
        onChange={(e) => setProcessId(e.target.value)}
        error={errors.process}
      />
      <div className="field-pair">
        <Select
          id="document-type"
          label="Tipo (carpeta)"
          icon="book"
          options={catalog.types.map((t) => ({ value: t.id, text: t.name }))}
          emptyLabel="Elige el tipo"
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          error={errors.type}
        />
        <div className="field-pair">
          <Field
            id="document-code"
            label="Código"
            icon="tag"
            placeholder="MAN-TH-001"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={errors.code}
          />
          <Field
            id="document-version"
            label="Versión"
            placeholder={replaces ? `≠ ${replaces.version}` : '1.0'}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            error={errors.version}
          />
        </div>
      </div>
      <Field
        id="document-title"
        label="Título"
        icon="file"
        placeholder="Manual de procesos de Talento Humano"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
      />
      <TextArea
        id="document-description"
        label="Descripción (opcional)"
        rows={2}
        placeholder="Para qué sirve y a quién aplica."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="field">
        <SegmentedControl
          id="document-classification"
          label="Clasificación"
          options={CLASSIFICATION_OPTIONS}
          value={classification}
          onChange={(value) => setClassification(value as Classification)}
          error={errors.classification}
        />
        <p className="help">
          {classification ? CLASSIFICATIONS[classification].detail : 'Decide quién lee el documento y quién lo descarga.'} Tú y los aprobadores
          siempre pueden leerlo y descargarlo.
        </p>
      </div>

      {classification === 'restricted' && (
        <>
          <fieldset className="checkbox-group" aria-describedby={errors.roles ? 'document-roles-error' : undefined}>
            <legend>Roles que pueden leerlo</legend>
            {catalog.roles.map((role) => (
              <Checkbox
                key={role.id}
                label={role.name}
                checked={allowedRoleIds.includes(role.id)}
                onChange={(e) => toggleRole(role.id, e.target.checked)}
              />
            ))}
          </fieldset>
          {errors.roles && (
            <p className="error" id="document-roles-error">
              {errors.roles}
            </p>
          )}
        </>
      )}

      <FileDrop id="document-file" file={file} onChange={chooseFile} error={errors.file} rules={DOCUMENT_FILES} />
      {document && !file && <p className="help">Si no eliges otro archivo, se mantiene «{document.fileName}».</p>}
    </FormModal>
  )
}
