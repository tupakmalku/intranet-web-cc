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
}

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
