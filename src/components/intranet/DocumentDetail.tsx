import { useState } from 'react'
import { backend } from '../../backend/index.ts'
import { useSession } from '../../context/auth.ts'
import { useToast } from '../../context/toasts.ts'
import {
  canArchiveDocument,
  canEditDocument,
  canRemoveDocument,
  canReviewDocument,
  documentAccess,
  isDocumentOwner,
} from '../../domain/documents.ts'
import type { IntranetDocument } from '../../domain/types.ts'
import DocumentoForm from '../../forms/DocumentoForm.tsx'
import RevisionForm from '../../forms/RevisionForm.tsx'
import { formatDateTime } from '../../lib/dates.ts'
import { errorMessage } from '../../lib/errors.ts'
import { formatSize, saveFile } from '../../lib/files.ts'
import Button from '../ui/Button.tsx'
import ConfirmDialog from '../ui/ConfirmDialog.tsx'
import { processNameOf, typeNameOf, type IntranetCatalog } from './catalog.ts'
import Icon from '../ui/Icon.tsx'
import Modal from '../ui/Modal.tsx'
import { ClassificationBadge, DocumentStatusBadge } from './DocumentBadges.tsx'
import DocumentViewer from './DocumentViewer.tsx'

interface Props {
  document: IntranetDocument
  catalog: IntranetCatalog
  /** Algo cambió (estado, datos, archivo): quien lo muestra debe volver a leer los documentos. */
  onChanged: () => void
  onClose: () => void
}

/**
 * Detalle de un documento de la intranet: sus datos, quién puede leerlo y,
 * según el usuario, las acciones para leerlo, descargarlo, aprobarlo,
 * corregirlo, subir una versión nueva, retirarlo o eliminarlo.
 */
export default function DocumentDetail({ document, catalog, onChanged, onClose }: Props) {
  const { roles, names } = catalog
  const session = useSession()
  const toast = useToast()
  const [viewing, setViewing] = useState(false)
  const [form, setForm] = useState<'edit' | 'version' | null>(null)
  const [confirming, setConfirming] = useState<'archive' | 'remove' | null>(null)
  const [downloadError, setDownloadError] = useState('')

  const access = documentAccess(document, session)
  const owner = isDocumentOwner(document, session)
  const canNewVersion = owner && document.status === 'published' && session.can('documents.publish')
  const roleNames = roles.filter((r) => document.allowedRoleIds.includes(r.id)).map((r) => r.name)

  async function download() {
    setDownloadError('')
    try {
      saveFile(await backend.documents.getFile(document), document.fileName)
    } catch (error) {
      setDownloadError(errorMessage(error))
    }
  }

  const footer = (canRemoveDocument(document, session) || canArchiveDocument(document, session) || canNewVersion || canEditDocument(document, session)) && (
    <>
      {canRemoveDocument(document, session) && (
        <Button variant="danger" icon="remove" onClick={() => setConfirming('remove')}>
          Eliminar
        </Button>
      )}
      {canArchiveDocument(document, session) && (
        <Button variant="secondary" icon="archive" onClick={() => setConfirming('archive')}>
          Retirar
        </Button>
      )}
      {canNewVersion && (
        <Button variant="secondary" icon="layers" onClick={() => setForm('version')}>
          Nueva versión
        </Button>
      )}
      {canEditDocument(document, session) && (
        <Button variant="secondary" icon="edit" onClick={() => setForm('edit')}>
          Corregir
        </Button>
      )}
    </>
  )

  return (
    <Modal title={document.title} description={`${document.code} · versión ${document.version}`} size="wide" onClose={onClose} footer={footer}>
      <div className="detail">
        <dl className="detail-facts">
          <div>
            <dt>Estado</dt>
            <dd>
              <DocumentStatusBadge status={document.status} />
            </dd>
          </div>
          <div>
            <dt>Clasificación</dt>
            <dd>
              <ClassificationBadge classification={document.classification} />
            </dd>
          </div>
          <div>
            <dt>Carpeta</dt>
            <dd>{typeNameOf(catalog, document.typeId)}</dd>
          </div>
          <div className="detail-wide">
            <dt>Proceso</dt>
            <dd>{processNameOf(catalog, document.processId)}</dd>
          </div>
          <div>
            <dt>Subido por</dt>
            <dd>{names.get(document.ownerId) ?? 'Otro usuario'}</dd>
          </div>
          <div>
            <dt>{document.publishedAt ? 'Publicado' : 'Enviado'}</dt>
            <dd>{formatDateTime(document.publishedAt ?? document.submittedAt)}</dd>
          </div>
          {document.reviewedBy && (
            <div>
              <dt>{document.status === 'rejected' ? 'Observado por' : 'Aprobado por'}</dt>
              <dd>{names.get(document.reviewedBy) ?? 'Otro usuario'}</dd>
            </div>
          )}
        </dl>

        {document.description && <p className="detail-text">{document.description}</p>}

        {document.classification === 'restricted' && (
          <p className="help">
            <strong>Lo leen:</strong> {roleNames.length ? roleNames.join(', ') : 'ningún rol vigente'}, además de su dueño y los aprobadores.
          </p>
        )}

        {document.reviewNote && (
          <p className={`notice ${document.status === 'rejected' ? 'notice-warning' : 'notice-success'}`}>
            <Icon name="comment" size={18} />
            <span className="detail-text">
              <strong>Comentario de la revisión:</strong> {document.reviewNote}
            </span>
          </p>
        )}
        {document.status === 'rejected' && owner && (
          <p className="help">Corrige lo observado y vuelve a enviarlo con el botón «Corregir».</p>
        )}
        {document.replacesId && document.status === 'pending' && <p className="help">Es una versión nueva: al aprobarla se retira la anterior.</p>}

        <section className="detail-section">
          <h3>Archivo</h3>
          <div className="file">
            <Icon name="file" size={24} />
            <span className="file-name">{document.fileName}</span>
            <div className="table-actions">
              {access.read && (
                <Button size="small" variant="secondary" icon="eye" onClick={() => setViewing(true)}>
                  Leer
                </Button>
              )}
              {access.download && (
                <Button size="small" variant="secondary" icon="download" onClick={download}>
                  Descargar
                </Button>
              )}
            </div>
            <small>
              {formatSize(document.size)}
              {!access.download && ' · Solo lectura: no se puede descargar.'}
            </small>
          </div>
          {downloadError && (
            <p className="notice notice-error" role="alert">
              {downloadError}
            </p>
          )}
        </section>

        {canReviewDocument(document, session) && (
          <section className="detail-section">
            <h3>Aprobar la publicación</h3>
            <p className="help">Léelo antes de aprobarlo. Al aprobarlo, lo verán en la intranet quienes permite su clasificación.</p>
            <RevisionForm
              approveLabel="Aprobar y publicar"
              review={(approved, note) => backend.documents.review(document.id, approved, note)}
              onReviewed={(approved) => {
                toast(approved ? 'Documento publicado' : 'Documento observado')
                onChanged()
              }}
            />
          </section>
        )}
        {document.status === 'pending' && owner && session.can('documents.approve') && (
          <p className="help">Tú lo subiste: debe aprobarlo otro aprobador de publicaciones.</p>
        )}
      </div>

      {viewing && <DocumentViewer document={document} canDownload={access.download} onClose={() => setViewing(false)} />}

      {form && (
        <DocumentoForm
          document={form === 'edit' ? document : undefined}
          replaces={form === 'version' ? document : undefined}
          catalog={catalog}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            toast('Documento enviado a aprobación')
            onChanged()
          }}
        />
      )}

      {confirming === 'archive' && (
        <ConfirmDialog
          title="Retirar documento"
          confirmLabel="Retirar documento"
          onClose={() => setConfirming(null)}
          onConfirm={async () => {
            await backend.documents.archive(document.id)
            toast('Documento retirado')
            onChanged()
          }}
        >
          «{document.title}» dejará de verse en la intranet. Su dueño y los aprobadores lo seguirán viendo como retirado.
        </ConfirmDialog>
      )}

      {confirming === 'remove' && (
        <ConfirmDialog
          title="Eliminar documento"
          confirmLabel="Eliminar documento"
          danger
          onClose={() => setConfirming(null)}
          onConfirm={async () => {
            await backend.documents.remove(document)
            toast('Documento eliminado')
            onClose()
            onChanged()
          }}
        >
          Se eliminará «{document.title}» junto con su archivo. Esta acción no se puede deshacer.
        </ConfirmDialog>
      )}
    </Modal>
  )
}
