import type { IntranetDocument, Session } from './types.ts'

/*
 * Permisos sobre los documentos de la intranet. Es la única regla de acceso:
 * la usan las pantallas y el backend local, y la migración de Supabase la
 * repite en SQL (políticas de la tabla documents). Si cambia aquí, cambia allá.
 */

export interface DocumentAccess {
  /** Puede abrir el documento en el visor de la intranet. */
  read: boolean
  /** Puede bajar el archivo original. */
  download: boolean
}

const NONE: DocumentAccess = { read: false, download: false }

/** Es el dueño del documento: quien lo subió. */
export const isDocumentOwner = (document: IntranetDocument, session: Session) => document.ownerId === session.user.id

export const isPublicationApprover = (session: Session) => session.role.permissions.includes('documents.approve')

/**
 * Qué puede hacer el usuario en sesión con un documento:
 * - El dueño y los aprobadores lo leen y lo descargan siempre, en cualquier estado.
 * - Los demás solo ven lo publicado, y según la clasificación:
 *   público → leer y descargar; uso interno → solo leer; restringido → solo leer, y solo los roles elegidos.
 */
export function documentAccess(document: IntranetDocument, session: Session): DocumentAccess {
  if (isDocumentOwner(document, session) || isPublicationApprover(session)) return { read: true, download: true }
  if (document.status !== 'published') return NONE
  switch (document.classification) {
    case 'public':
      return { read: true, download: true }
    case 'internal':
      return { read: true, download: false }
    case 'restricted':
      return document.allowedRoleIds.includes(session.role.id) ? { read: true, download: false } : NONE
  }
}

/** Lo puede editar y volver a enviar su dueño, mientras no esté publicado. */
export const canEditDocument = (document: IntranetDocument, session: Session) =>
  isDocumentOwner(document, session) && (document.status === 'pending' || document.status === 'rejected')

/**
 * Lo aprueba un aprobador que no sea quien lo subió: nadie aprueba su propio
 * documento (segregación de funciones).
 */
export const canReviewDocument = (document: IntranetDocument, session: Session) =>
  document.status === 'pending' && isPublicationApprover(session) && !isDocumentOwner(document, session)

/** Retiran un documento publicado su dueño o un aprobador. */
export const canArchiveDocument = (document: IntranetDocument, session: Session) =>
  document.status === 'published' && (isDocumentOwner(document, session) || isPublicationApprover(session))

/** Lo eliminan su dueño, si no está publicado, o un aprobador. */
export const canRemoveDocument = (document: IntranetDocument, session: Session) =>
  isPublicationApprover(session) || (isDocumentOwner(document, session) && document.status !== 'published')
