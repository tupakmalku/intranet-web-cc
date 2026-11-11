/*
 * Modelo de la aplicación. No depende de ningún backend: tanto Supabase como
 * el backend local convierten sus datos a estos tipos.
 */

/** Lo que un rol permite hacer. Los roles se arman combinando estos permisos. */
export type Permission =
  | 'users.manage' // Crear usuarios, habilitarlos y restablecer contraseñas.
  | 'roles.manage' // Crear y editar roles.
  | 'documents.publish' // Subir documentos a la intranet y enviarlos a aprobación.
  | 'documents.approve' // Aprobar u observar la publicación de documentos.
  | 'intranet.configure' // Mantener el mapa de procesos y los tipos de documento de la intranet.
  | 'audit.view' // Consultar el registro de auditoría.

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  /** Los roles del sistema no se pueden eliminar. */
  system: boolean
}

export interface User {
  id: string
  email: string
  fullName: string
  roleId: string
  active: boolean
  /** Tiene una contraseña temporal y debe cambiarla antes de usar la aplicación. */
  mustChangePassword: boolean
  /** Cumpleaños como MM-DD, sin año (no se guarda la edad). Null si no se registró. */
  birthday: string | null
  /**
   * Clave de la foto de perfil, o null si no tiene. Es opaca: la pantalla
   * obtiene la imagen con `backend.users.photoUrl`. Cambia al reemplazar la foto.
   */
  photo: string | null
}

export interface Session {
  user: User
  role: Role
  /** Cuándo ingresó (ISO). Sirve para cerrar la sesión al cumplir su duración máxima. */
  startedAt: string
  /** Verificación en dos pasos del usuario en esta sesión. */
  mfa: MfaState
}

/**
 * Política de verificación en dos pasos de la institución:
 * - off: opcional para todos.
 * - privileged: obligatoria para quien gestiona usuarios o roles.
 * - all: obligatoria para todos.
 */
export type MfaPolicy = 'off' | 'privileged' | 'all'

export interface MfaState {
  /** Tiene una aplicación autenticadora configurada. */
  enrolled: boolean
  /** La política se la exige. */
  required: boolean
  /** Ya ingresó el código en esta sesión. */
  verified: boolean
}

/**
 * Identidad institucional: misión, visión, valores y política de calidad. Es
 * información pública (se muestra también en la pantalla de ingreso). Vacía, la
 * sección no aparece.
 */
export interface InstitutionProfile {
  mission: string
  vision: string
  values: string[]
  qualityPolicy: string
  /**
   * Código del documento oficial de la política de calidad en la intranet (por
   * ejemplo, el manual de calidad). Se enlaza la versión publicada vigente.
   */
  qualityDocumentCode: string | null
  /** Qué se muestra en la pantalla de ingreso: todo (misión, visión, valores y política), una parte o nada. */
  loginHighlight: 'all' | 'mission' | 'values' | 'none'
}

/** Configuración de seguridad que se guarda en el servidor (la hace cumplir la base de datos). */
export interface SecuritySettings {
  mfaPolicy: MfaPolicy
}

/** Una entrada del registro de auditoría. No se modifica ni se elimina. */
export interface AuditEntry {
  id: string
  /** Cuándo (ISO). */
  at: string
  /** Quién lo hizo; null si fue el sistema. */
  actorId: string | null
  actorName: string
  action: AuditAction
  /** Sobre qué: el nombre visible del documento, usuario, rol… */
  targetName: string
  /** Datos adicionales, en texto legible. */
  detail: string
}

/** Lo que se registra. Los textos en español están en src/domain/audit.ts. */
export type AuditAction =
  | 'session.login'
  | 'session.logout'
  | 'session.expired'
  | 'password.changed'
  | 'mfa.enabled'
  | 'mfa.disabled'
  | 'mfa.reset'
  | 'user.created'
  | 'user.updated'
  | 'user.password_reset'
  | 'role.saved'
  | 'role.deleted'
  | 'document.submitted'
  | 'document.approved'
  | 'document.rejected'
  | 'document.archived'
  | 'document.deleted'
  | 'document.viewed'
  | 'document.downloaded'
  | 'catalog.changed'
  | 'institution.changed'
  | 'settings.changed'

// ---------- Intranet: documentos institucionales ----------

/**
 * Un elemento del mapa de procesos de la institución. El nivel sale de su
 * posición en el árbol: sin padre es un macroproceso ("2. Macroprocesos
 * productivos"), con padre macroproceso es un proceso ("2.1 Gestión de
 * captaciones") y debajo de un proceso, un subproceso ("2.2.1 Gestión de
 * créditos"). Se mantiene desde la intranet, así que el mapa puede cambiar.
 */
export interface ProcessNode {
  id: string
  /** Null en los macroprocesos. */
  parentId: string | null
  /** Numeración del mapa: "2", "2.1", "2.2.1". */
  code: string
  name: string
  /** Orden entre los elementos del mismo nivel. */
  position: number
}

/** Tipo de documento: Manual, Procedimiento, Registro, Tomo 1... Es un catálogo que se mantiene en la intranet. */
export interface DocumentType {
  id: string
  name: string
  /** Orden en que se muestran las carpetas de cada proceso. */
  position: number
}

/**
 * Clasificación de la información, que elige quien sube el documento. De ella
 * salen los permisos de quien lo consulta (ver src/domain/documents.ts).
 */
export type Classification = 'public' | 'internal' | 'restricted'

/**
 * - pending: enviado a aprobación; solo lo ven quien lo subió y los aprobadores.
 * - published: aprobado y visible en la intranet según su clasificación.
 * - rejected: observado; quien lo subió lo corrige y lo vuelve a enviar.
 * - archived: retirado de la intranet, o reemplazado por una versión nueva.
 */
export type DocumentStatus = 'pending' | 'published' | 'rejected' | 'archived'

/** Un documento publicado en la intranet: manual, procedimiento, anexo... */
export interface IntranetDocument {
  id: string
  /** Código interno: "MAN-SI-001". */
  code: string
  title: string
  /** Tipo de documento (catálogo DocumentType): la carpeta en que aparece. */
  typeId: string
  /** Proceso o subproceso del mapa al que pertenece. Su dueño es el área responsable de ese proceso. */
  processId: string
  /** Versión tal como la maneja el área: "1.0", "2". */
  version: string
  description: string
  classification: Classification
  /** Roles que pueden leerlo cuando es restringido. Vacío en los demás. */
  allowedRoleIds: string[]
  status: DocumentStatus
  /** Comentario de la última revisión. */
  reviewNote: string
  /** Quien lo subió: el dueño del documento. */
  ownerId: string
  /** Quien aprobó u observó la publicación. */
  reviewedBy: string | null
  /** Fecha y hora (ISO) del último envío a aprobación. */
  submittedAt: string
  /** Fecha y hora (ISO) de la publicación. */
  publishedAt: string | null
  /** Documento publicado que este reemplaza al aprobarse (versión anterior). */
  replacesId: string | null
  fileName: string
  mimeType: string
  size: number
  /** Ubicación del archivo en el almacenamiento del backend. */
  path: string
}
