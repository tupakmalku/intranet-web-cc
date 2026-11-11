import { CLASSIFICATIONS, DOCUMENT_STATUSES } from '../../domain/labels.ts'
import type { Classification, DocumentStatus } from '../../domain/types.ts'
import Icon from '../ui/Icon.tsx'

/** Insignia con la clasificación de un documento: público, uso interno o restringido. */
export function ClassificationBadge({ classification }: { classification: Classification }) {
  const { name, badge, detail } = CLASSIFICATIONS[classification]
  return (
    <span className={`badge ${badge}`} title={detail}>
      {classification !== 'public' && <Icon name="lock" size={14} />}
      {name}
    </span>
  )
}

/** Insignia con el estado de la publicación: por aprobar, publicado, observado o retirado. */
export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const { name, badge } = DOCUMENT_STATUSES[status]
  return <span className={`badge ${badge}`}>{name}</span>
}
