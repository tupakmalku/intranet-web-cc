import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { backend } from '../../backend/index.ts'
import { useToast } from '../../context/toasts.ts'
import { VIEW_PATHS } from '../../pages/intranetViews.ts'
import { childrenOf, countIn, MAX_PROCESS_LEVEL, PROCESS_LEVELS, processLabel, type ProcessLevel } from '../../domain/processes.ts'
import type { DocumentType, IntranetDocument, ProcessNode } from '../../domain/types.ts'
import ProcesoForm from '../../forms/ProcesoForm.tsx'
import TipoDocumentoForm from '../../forms/TipoDocumentoForm.tsx'
import { errorMessage } from '../../lib/errors.ts'
import InstitutionSettings from '../institution/InstitutionSettings.tsx'
import Button from '../ui/Button.tsx'
import Card from '../ui/Card.tsx'
import ConfirmDialog from '../ui/ConfirmDialog.tsx'
import Icon from '../ui/Icon.tsx'
import type { IntranetCatalog } from './catalog.ts'

interface Props {
  catalog: IntranetCatalog
  /** Todos los documentos que el usuario ve, para mostrar cuántos hay en cada proceso y tipo. */
  documents: IntranetDocument[]
  /** El mapa o los tipos cambiaron: hay que volver a leerlos. */
  onChanged: () => void
}

type ProcessForm = { process?: ProcessNode; parent: ProcessNode | null }

/** Pestaña de la identidad institucional: /configuracion/institucion. */
const INSTITUTION_SECTION = 'institucion'

const SETTINGS_TABS = [
  { path: VIEW_PATHS.config, label: 'Mapa de procesos' },
  { path: `${VIEW_PATHS.config}/${INSTITUTION_SECTION}`, label: 'Nuestra institución' },
]

/**
 * Configuración de la intranet, en dos pestañas como Seguridad (cada una con su
 * dirección): el mapa de procesos (macroprocesos, procesos y subprocesos, con su
 * orden) junto a los tipos de documento, que son las carpetas de cada proceso; y
 * la identidad de la institución (misión, visión, valores y política de calidad
 * que se muestran en el ingreso).
 */
export default function IntranetSettings({ catalog, documents, onChanged }: Props) {
  const { section } = useParams()
  const toast = useToast()
  const [processForm, setProcessForm] = useState<ProcessForm | null>(null)
  const [typeForm, setTypeForm] = useState<{ type?: DocumentType } | null>(null)
  const [removingProcess, setRemovingProcess] = useState<ProcessNode | null>(null)
  const [removingType, setRemovingType] = useState<DocumentType | null>(null)
  const [moveError, setMoveError] = useState('')

  async function move(operation: () => Promise<void>) {
    setMoveError('')
    try {
      await operation()
      onChanged()
    } catch (error) {
      setMoveError(errorMessage(error))
    }
  }

  /** Una fila del árbol con sus hijos. */
  function renderNode(node: ProcessNode, level: ProcessLevel, index: number, count: number) {
    const children = childrenOf(catalog.processes, node.id)
    const total = countIn(catalog.processes, documents, node.id)
    const childLevel = (level + 1) as ProcessLevel
    return (
      <li key={node.id}>
        <div className={`settings-row level-${level}`}>
          <span className="settings-name">
            <strong>{processLabel(node)}</strong>
            <small>
              {PROCESS_LEVELS[level].name}
              {total > 0 && ` · ${total} ${total === 1 ? 'documento' : 'documentos'}`}
            </small>
          </span>
          <div className="table-actions">
            <button type="button" className="icon-button" disabled={index === 0} onClick={() => move(() => backend.processes.move(node.id, -1))} aria-label={`Subir ${node.name}`} title="Subir">
              <Icon name="chevronUp" size={18} />
            </button>
            <button type="button" className="icon-button" disabled={index === count - 1} onClick={() => move(() => backend.processes.move(node.id, 1))} aria-label={`Bajar ${node.name}`} title="Bajar">
              <Icon name="chevronDown" size={18} />
            </button>
            {level < MAX_PROCESS_LEVEL && (
              <button
                type="button"
                className="icon-button"
                onClick={() => setProcessForm({ parent: node })}
                aria-label={`Agregar ${PROCESS_LEVELS[childLevel].name.toLowerCase()} en ${node.name}`}
                title={`Agregar ${PROCESS_LEVELS[childLevel].name.toLowerCase()}`}
              >
                <Icon name="add" size={18} />
              </button>
            )}
            <button type="button" className="icon-button" onClick={() => setProcessForm({ process: node, parent: null })} aria-label={`Editar ${node.name}`} title="Editar">
              <Icon name="edit" size={18} />
            </button>
            <button type="button" className="icon-button danger" onClick={() => setRemovingProcess(node)} aria-label={`Eliminar ${node.name}`} title="Eliminar">
              <Icon name="remove" size={18} />
            </button>
          </div>
        </div>
        {children.length > 0 && <ul>{children.map((child, i) => renderNode(child, childLevel, i, children.length))}</ul>}
      </li>
    )
  }

  const macros = childrenOf(catalog.processes, null)

  return (
    <>
      <nav className="tabs" aria-label="Secciones de configuración">
        {SETTINGS_TABS.map((tab) => (
          <NavLink key={tab.label} to={tab.path} end>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {section === INSTITUTION_SECTION ? (
        <InstitutionSettings documents={documents} />
      ) : (
        <div className="settings">
          {moveError && (
            <p className="notice notice-error" role="alert">
              {moveError}
            </p>
          )}

          <Card
            title="Mapa de procesos"
            subtitle="Macroprocesos, procesos y subprocesos, en el orden en que se muestran en la intranet."
            action={
              <Button size="small" icon="add" onClick={() => setProcessForm({ parent: null })}>
                Macroproceso
              </Button>
            }
          >
            {macros.length ? (
              <ul className="settings-tree">{macros.map((macro, i) => renderNode(macro, 0, i, macros.length))}</ul>
            ) : (
              <p className="help">Agrega el primer macroproceso para empezar el mapa.</p>
            )}
          </Card>

          <Card
            title="Tipos de documento"
            subtitle="Son las carpetas de cada proceso, en este orden."
            action={
              <Button size="small" icon="add" onClick={() => setTypeForm({})}>
                Tipo
              </Button>
            }
          >
            <ul className="settings-tree">
              {catalog.types.map((type, i) => {
                const count = documents.filter((d) => d.typeId === type.id).length
                return (
                  <li key={type.id}>
                    <div className="settings-row">
                      <span className="settings-name">
                        <strong>{type.name}</strong>
                        {count > 0 && <small>{count === 1 ? '1 documento' : `${count} documentos`}</small>}
                      </span>
                      <div className="table-actions">
                        <button type="button" className="icon-button" disabled={i === 0} onClick={() => move(() => backend.documentTypes.move(type.id, -1))} aria-label={`Subir ${type.name}`} title="Subir">
                          <Icon name="chevronUp" size={18} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          disabled={i === catalog.types.length - 1}
                          onClick={() => move(() => backend.documentTypes.move(type.id, 1))}
                          aria-label={`Bajar ${type.name}`}
                          title="Bajar"
                        >
                          <Icon name="chevronDown" size={18} />
                        </button>
                        <button type="button" className="icon-button" onClick={() => setTypeForm({ type })} aria-label={`Editar ${type.name}`} title="Editar">
                          <Icon name="edit" size={18} />
                        </button>
                        <button type="button" className="icon-button danger" onClick={() => setRemovingType(type)} aria-label={`Eliminar ${type.name}`} title="Eliminar">
                          <Icon name="remove" size={18} />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>

          {processForm && (
            <ProcesoForm
              processes={catalog.processes}
              process={processForm.process}
              parent={processForm.parent}
              onClose={() => setProcessForm(null)}
              onSaved={() => {
                setProcessForm(null)
                toast('Mapa de procesos actualizado')
                onChanged()
              }}
            />
          )}

          {typeForm && (
            <TipoDocumentoForm
              type={typeForm.type}
              onClose={() => setTypeForm(null)}
              onSaved={() => {
                setTypeForm(null)
                toast('Tipo de documento guardado')
                onChanged()
              }}
            />
          )}

          {removingProcess && (
            <ConfirmDialog
              title="Eliminar del mapa"
              confirmLabel="Eliminar"
              danger
              onClose={() => setRemovingProcess(null)}
              onConfirm={async () => {
                await backend.processes.remove(removingProcess.id)
                toast('Eliminado del mapa de procesos')
                onChanged()
              }}
            >
              Se eliminará «{processLabel(removingProcess)}». Solo se puede si no tiene nada debajo ni documentos.
            </ConfirmDialog>
          )}

          {removingType && (
            <ConfirmDialog
              title="Eliminar tipo de documento"
              confirmLabel="Eliminar tipo"
              danger
              onClose={() => setRemovingType(null)}
              onConfirm={async () => {
                await backend.documentTypes.remove(removingType.id)
                toast('Tipo de documento eliminado')
                onChanged()
              }}
            >
              Se eliminará el tipo «{removingType.name}». Solo se puede si ningún documento es de este tipo.
            </ConfirmDialog>
          )}
        </div>
      )}
    </>
  )
}
