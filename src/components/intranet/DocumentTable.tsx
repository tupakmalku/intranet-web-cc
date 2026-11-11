import { useSession } from '../../context/auth.ts'
import { documentAccess } from '../../domain/documents.ts'
import type { IntranetDocument } from '../../domain/types.ts'
import { formatDate } from '../../lib/dates.ts'
import Icon from '../ui/Icon.tsx'
import { processNameOf, typeNameOf, type IntranetCatalog } from './catalog.ts'
import { ClassificationBadge, DocumentStatusBadge } from './DocumentBadges.tsx'

interface Props {
  documents: IntranetDocument[]
  catalog: IntranetCatalog
  /** Muestra el proceso de cada documento (en búsquedas y listas que mezclan procesos). */
  showProcess?: boolean
  /** Muestra el estado de la publicación en lugar de la fecha (mis documentos, por aprobar). */
  showStatus?: boolean
  /** Agrega quién lo envió (por aprobar). */
  showOwner?: boolean
  onOpen: (document: IntranetDocument) => void
  onRead: (document: IntranetDocument) => void
  onDownload: (document: IntranetDocument) => void
}

/** Tabla de documentos de la intranet, con los botones de leer y descargar según lo que permite su clasificación. */
export default function DocumentTable({ documents, catalog, showProcess, showStatus, showOwner, onOpen, onRead, onDownload }: Props) {
  const session = useSession()
  return (
    <div className="card table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Documento</th>
            {showProcess && <th>Proceso</th>}
            <th>Tipo</th>
            <th>Versión</th>
            <th>Clasificación</th>
            <th>{showStatus ? 'Estado' : 'Publicado'}</th>
            <th>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => {
            const access = documentAccess(document, session)
            return (
              <tr key={document.id}>
                <td>
                  <button type="button" className="table-name" onClick={() => onOpen(document)}>
                    {document.title}
                  </button>
                  <small>
                    {document.code}
                    {showOwner && ` · enviado por ${catalog.names.get(document.ownerId) ?? 'otro usuario'}`}
                  </small>
                </td>
                {showProcess && <td className="cell-process">{processNameOf(catalog, document.processId)}</td>}
                <td>{typeNameOf(catalog, document.typeId)}</td>
                <td>{document.version}</td>
                <td>
                  <ClassificationBadge classification={document.classification} />
                </td>
                <td className="nowrap">{showStatus ? <DocumentStatusBadge status={document.status} /> : formatDate(document.publishedAt)}</td>
                <td>
                  <div className="table-actions">
                    {access.read && (
                      <button type="button" className="icon-button" onClick={() => onRead(document)} aria-label={`Leer ${document.title}`} title="Leer">
                        <Icon name="eye" size={18} />
                      </button>
                    )}
                    {access.download && (
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => onDownload(document)}
                        aria-label={`Descargar ${document.title}`}
                        title="Descargar"
                      >
                        <Icon name="download" size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
