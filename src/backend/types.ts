import type { AuditGroup } from '../domain/audit.ts'
import type { AuditEntry, DocumentType, IntranetDocument, ProcessNode, Role, SecuritySettings, Session, User } from '../domain/types.ts'

/*
 * Contrato del backend. La aplicación solo conoce esta interfaz: para migrar a
 * otro backend (una API propia, Firebase, etc.) basta con escribir otra
 * implementación de `Backend` y registrarla en ./index.ts. Ninguna pantalla
 * importa Supabase directamente.
 */

/** Error con un mensaje en español que se puede mostrar tal cual al usuario. */
export class BackendError extends Error {}

export type RoleInput = Pick<Role, 'name' | 'description' | 'permissions'> & { id?: string }
/** Lo que llena el dueño al subir un documento. `replacesId`: la versión publicada que reemplaza. */
export type DocumentInput = Pick<
  IntranetDocument,
  'code' | 'title' | 'typeId' | 'processId' | 'version' | 'description' | 'classification' | 'allowedRoleIds'
> & { id?: string; replacesId?: string | null }
export type ProcessInput = Pick<ProcessNode, 'parentId' | 'code' | 'name'> & { id?: string }
export type DocumentTypeInput = Pick<DocumentType, 'name'> & { id?: string }
export type NewUser = Pick<User, 'email' | 'fullName' | 'roleId' | 'birthday'>
export type UserPatch = Pick<User, 'fullName' | 'roleId' | 'active' | 'birthday'>

/** Lo necesario para configurar la aplicación autenticadora. */
export interface MfaEnrollment {
  /** Identificador de la configuración pendiente, para confirmarla. */
  factorId: string
  /** Imagen del código QR (dirección para un <img>). */
  qrCode: string
  /** La clave, para escribirla a mano si no se puede escanear. */
  secret: string
}

export interface AuditFilter {
  /** Desde y hasta (AAAA-MM-DD, inclusive). */
  from?: string
  to?: string
  group?: AuditGroup
  /** Texto a buscar en el usuario, la acción o el objeto. */
  query?: string
  /** Máximo de entradas, de la más reciente a la más antigua. */
  limit: number
}

export interface AuthApi {
  /** La sesión abierta, o null si no hay ninguna. */
  getSession(): Promise<Session | null>
  signIn(email: string, password: string): Promise<Session>
  /** Cierra la sesión. `expired`: la cerró la caducidad, no el usuario (queda así en la auditoría). */
  signOut(reason?: 'expired'): Promise<void>
  /** Cambia la contraseña del usuario en sesión y da por cumplido el cambio obligatorio. */
  changePassword(current: string, next: string): Promise<void>
  /** Registra o corrige el cumpleaños del usuario en sesión (MM-DD, o null para quitarlo). */
  setMyBirthday(birthday: string | null): Promise<void>
  /** Empieza a configurar la aplicación autenticadora: devuelve el QR y la clave. */
  startMfaEnrollment(): Promise<MfaEnrollment>
  /** Confirma la configuración con un código de la aplicación; la sesión queda verificada. */
  confirmMfaEnrollment(factorId: string, code: string): Promise<void>
  /** Verifica la sesión con un código de la aplicación ya configurada. */
  verifyMfa(code: string): Promise<void>
  /** Quita la aplicación autenticadora propia. No se puede si la política la exige. */
  disableMfa(): Promise<void>
}

export interface UsersApi {
  list(): Promise<User[]>
  /** Crea el usuario con una contraseña temporal, que se devuelve para entregársela. */
  create(input: NewUser): Promise<{ user: User; temporaryPassword: string }>
  update(id: string, patch: UserPatch): Promise<User>
  /** Genera una contraseña temporal nueva y obliga a cambiarla en el siguiente ingreso. */
  resetPassword(id: string): Promise<string>
  /**
   * Pone o quita (null) la foto de perfil. Puede hacerlo quien gestiona
   * usuarios, con cualquiera, y cada usuario con la suya. La imagen llega ya
   * recortada y comprimida (src/lib/images.ts).
   */
  setPhoto(id: string, photo: Blob | null): Promise<User>
  /** Dirección para mostrar la foto en un <img>, o null si no tiene. */
  photoUrl(user: Pick<User, 'id' | 'photo'>): Promise<string | null>
  /** Quita la aplicación autenticadora de un usuario que la perdió; la configura de nuevo en su próximo ingreso. */
  resetMfa(id: string): Promise<void>
}

/** Configuración de seguridad guardada en el servidor. La cambia quien gestiona roles. */
export interface SecurityApi {
  getSettings(): Promise<SecuritySettings>
  saveSettings(settings: SecuritySettings): Promise<SecuritySettings>
}

/** Registro de auditoría: solo se agrega y se consulta (con el permiso audit.view). */
export interface AuditApi {
  list(filter: AuditFilter): Promise<AuditEntry[]>
}

export interface RolesApi {
  list(): Promise<Role[]>
  save(input: RoleInput): Promise<Role>
  remove(id: string): Promise<void>
}

/** Mapa de procesos de la intranet. Lo leen todos; lo cambia quien configura la intranet. */
export interface ProcessesApi {
  list(): Promise<ProcessNode[]>
  /** Crea (al final de su nivel) o renombra. El padre no cambia al editar. */
  save(input: ProcessInput): Promise<ProcessNode>
  /** Solo si no tiene procesos debajo ni documentos. */
  remove(id: string): Promise<void>
  /** Sube (-1) o baja (+1) un lugar dentro de su nivel. */
  move(id: string, direction: -1 | 1): Promise<void>
}

/** Tipos de documento de la intranet: las carpetas de cada proceso. */
export interface DocumentTypesApi {
  list(): Promise<DocumentType[]>
  save(input: DocumentTypeInput): Promise<DocumentType>
  /** Solo si ningún documento es de ese tipo. */
  remove(id: string): Promise<void>
  move(id: string, direction: -1 | 1): Promise<void>
}

export interface DocumentsApi {
  /** Los documentos que el usuario puede ver: los publicados que su rol permite, los suyos y, si aprueba, los enviados. */
  list(): Promise<IntranetDocument[]>
  /**
   * Crea el documento (el archivo es obligatorio) o corrige uno propio que no
   * esté publicado (el archivo es opcional). En ambos casos queda por aprobar.
   */
  save(input: DocumentInput, file: File | null): Promise<IntranetDocument>
  /** Aprueba (publica) u observa un documento enviado. Al publicar una versión nueva se retira la anterior. */
  review(id: string, approved: boolean, note: string): Promise<IntranetDocument>
  /** Retira de la intranet un documento publicado. */
  archive(id: string): Promise<IntranetDocument>
  remove(document: IntranetDocument): Promise<void>
  /** El archivo, para el visor o para descargarlo, si el usuario tiene acceso. Queda en la auditoría. */
  getFile(document: IntranetDocument, purpose: 'view' | 'download'): Promise<Blob>
}

export interface Backend {
  /** Nombre de la implementación: "supabase" o "local". */
  name: string
  /** Aviso para la pantalla de ingreso cuando el backend es de demostración. */
  demoNotice?: string
  auth: AuthApi
  users: UsersApi
  roles: RolesApi
  documents: DocumentsApi
  processes: ProcessesApi
  documentTypes: DocumentTypesApi
  security: SecurityApi
  audit: AuditApi
}
