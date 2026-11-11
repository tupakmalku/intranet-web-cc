import type { Classification, DocumentStatus, Permission } from './types.ts'

/* Textos en español de los valores del modelo, que en el código van en inglés. */

export const PERMISSIONS: Record<Permission, { name: string; detail: string }> = {
  'users.manage': {
    name: 'Gestionar usuarios',
    detail: 'Crear usuarios, habilitarlos o inhabilitarlos y restablecer contraseñas.',
  },
  'roles.manage': {
    name: 'Gestionar roles',
    detail: 'Crear roles y decidir qué permite cada uno.',
  },
  'documents.publish': {
    name: 'Publicar documentos',
    detail: 'Subir manuales, procedimientos y anexos de su área a la intranet y enviarlos a aprobación.',
  },
  'documents.approve': {
    name: 'Aprobar publicaciones',
    detail: 'Aprobar u observar los documentos enviados a la intranet, y retirarlos.',
  },
  'intranet.configure': {
    name: 'Configurar la intranet',
    detail: 'Mantener el mapa de procesos (macroprocesos, procesos y subprocesos) y los tipos de documento.',
  },
  'audit.view': {
    name: 'Consultar la auditoría',
    detail: 'Ver quién hizo qué y cuándo: ingresos, cambios de usuarios y roles, y publicación, lectura y descarga de documentos.',
  },
}

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[]

export const CLASSIFICATIONS: Record<Classification, { name: string; detail: string; badge: string }> = {
  public: {
    name: 'Público',
    detail: 'Todos los usuarios lo leen y lo descargan.',
    badge: 'badge-active',
  },
  internal: {
    name: 'Uso interno',
    detail: 'Todos los usuarios lo leen en la intranet, pero no lo descargan.',
    badge: 'badge-state',
  },
  restricted: {
    name: 'Restringido',
    detail: 'Solo los roles que elijas lo leen en la intranet, y no lo descargan.',
    badge: 'badge-overdue',
  },
}

export const DOCUMENT_STATUSES: Record<DocumentStatus, { name: string; badge: string }> = {
  pending: { name: 'Por aprobar', badge: 'badge-today' },
  published: { name: 'Publicado', badge: 'badge-active' },
  rejected: { name: 'Observado', badge: 'badge-overdue' },
  archived: { name: 'Retirado', badge: 'badge-inactive' },
}
