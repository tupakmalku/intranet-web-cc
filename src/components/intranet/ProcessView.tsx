import { processTone } from '../../brand/index.ts'
import { childrenOf, countIn, processPath } from '../../domain/processes.ts'
import type { IntranetDocument } from '../../domain/types.ts'
import EmptyState from '../ui/EmptyState.tsx'
import Icon from '../ui/Icon.tsx'
import type { IntranetCatalog } from './catalog.ts'
import DocumentTable from './DocumentTable.tsx'

interface Props {
  catalog: IntranetCatalog
  /** Los documentos publicados que el usuario puede ver. */
  documents: IntranetDocument[]
  processId: string
  /** Carpeta abierta, o null para ver todos los documentos del proceso. */
  typeId: string | null
  /** Navega a otro proceso o carpeta; null vuelve al mapa. */
  onNavigate: (processId: string | null, typeId?: string | null) => void
  onOpenDocument: (document: IntranetDocument) => void
  onRead: (document: IntranetDocument) => void
  onDownload: (document: IntranetDocument) => void
}

/**
 * Un proceso o subproceso abierto: la ruta en el mapa, sus subprocesos, sus
 * carpetas (una por tipo de documento) y los documentos de la carpeta elegida.
 */
export default function ProcessView({ catalog, documents, processId, typeId, onNavigate, onOpenDocument, onRead, onDownload }: Props) {
  const path = processPath(catalog.processes, processId)
  const process = path.at(-1)
  if (!process) {
    return (
      <EmptyState title="Ese proceso ya no existe" action={<button type="button" className="link" onClick={() => onNavigate(null)}>Volver al mapa de procesos</button>}>
        Puede que lo hayan movido o eliminado del mapa.
      </EmptyState>
    )
  }

  const own = documents.filter((d) => d.processId === process.id)
  const folders = catalog.types.map((type) => ({ type, count: own.filter((d) => d.typeId === type.id).length })).filter((f) => f.count)
  const subprocesses = childrenOf(catalog.processes, process.id)
  const shown = typeId ? own.filter((d) => d.typeId === typeId) : own
  const total = countIn(catalog.processes, documents, process.id)
  const tone = childrenOf(catalog.processes, null).findIndex((m) => m.id === path[0].id)

  return (
    <div className="process-view" style={processTone(Math.max(tone, 0))}>
      <nav className="breadcrumb" aria-label="Ubicación en el mapa de procesos">
        <button type="button" onClick={() => onNavigate(null)}>
          <Icon name="chevronLeft" size={16} />
          Mapa de procesos
        </button>
        {path.slice(0, -1).map((p) => (
          <span key={p.id}>
            <span aria-hidden="true">›</span>
            {p.parentId ? (
              <button type="button" onClick={() => onNavigate(p.id)}>
                {p.code} {p.name}
              </button>
            ) : (
              <span className="breadcrumb-static">{p.name}</span>
            )}
          </span>
        ))}
      </nav>

      <header className="process-header">
        <span className="process-code">{process.code}</span>
        <h2>{process.name}</h2>
        <small>
          {total === 1 ? '1 documento publicado' : `${total} documentos publicados`}
          {subprocesses.length > 0 && ` en el proceso y ${subprocesses.length === 1 ? 'su subproceso' : `sus ${subprocesses.length} subprocesos`}`}
        </small>
      </header>

      {subprocesses.length > 0 && (
        <div className="subprocess-chips" aria-label="Subprocesos">
          {subprocesses.map((sub) => (
            <button key={sub.id} type="button" className="chip" onClick={() => onNavigate(sub.id)}>
              <Icon name="layers" size={16} />
              {sub.code} {sub.name}
              <span className="folder-count">{countIn(catalog.processes, documents, sub.id)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="process-body">
        <nav className="folder-list" aria-label="Carpetas">
          <button type="button" className={typeId ? '' : 'active'} aria-current={!typeId} onClick={() => onNavigate(process.id, null)}>
            <Icon name="folder" size={18} />
            <span>Todos</span>
            <span className="folder-count">{own.length}</span>
          </button>
          {folders.map(({ type, count }) => (
            <button
              key={type.id}
              type="button"
              className={type.id === typeId ? 'active' : ''}
              aria-current={type.id === typeId}
              onClick={() => onNavigate(process.id, type.id)}
            >
              <Icon name="folder" size={18} />
              <span>{type.name}</span>
              <span className="folder-count">{count}</span>
            </button>
          ))}
        </nav>

        <div className="process-documents">
          {shown.length ? (
            <DocumentTable documents={shown} catalog={catalog} onOpen={onOpenDocument} onRead={onRead} onDownload={onDownload} />
          ) : (
            <EmptyState title="Carpeta vacía">
              {subprocesses.length && !own.length
                ? 'Los documentos de este proceso están en sus subprocesos.'
                : 'No hay documentos publicados aquí, o no tienes acceso a ellos.'}
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  )
}
