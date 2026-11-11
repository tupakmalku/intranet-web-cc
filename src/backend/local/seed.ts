import type { AuditEntry, DocumentType, IntranetDocument, Permission, ProcessNode, Role, SecuritySettings, User } from '../../domain/types.ts'
import { ALL_PERMISSIONS } from '../../domain/labels.ts'
import { seedDocuments, seedDocumentTypes, seedProcesses } from './intranetSeed.ts'

/* Datos de ejemplo del backend local: roles, un usuario por rol, el mapa de procesos y documentos de la intranet. */

export type StoredUser = User & {
  password: string
  /** Clave de la aplicación autenticadora (base32), si la configuró. */
  mfaSecret?: string | null
  /** Configuración empezada y todavía no confirmada con un código. */
  mfaPending?: { factorId: string; secret: string } | null
}

export interface Db {
  roles: Role[]
  users: StoredUser[]
  documents: IntranetDocument[]
  processes: ProcessNode[]
  documentTypes: DocumentType[]
  sessionUserId: string | null
  /** Cuándo ingresó el usuario de la sesión (ISO), para su duración máxima. */
  sessionStartedAt?: string | null
  /** La sesión ya ingresó el código de verificación en dos pasos. */
  sessionVerified?: boolean
  /** Configuración de seguridad (en Supabase, la tabla app_settings). */
  settings?: SecuritySettings
  /** Registro de auditoría, del más antiguo al más reciente. */
  audit?: AuditEntry[]
}

/** Contraseña temporal de todos los usuarios de ejemplo. */
export const DEMO_PASSWORD = 'Temporal.2026'

/** Roles iniciales. Son los mismos que crea la migración de Supabase. */
export const DEFAULT_ROLES: { id: string; name: string; description: string; permissions: Permission[] }[] = [
  { id: 'role-admin', name: 'Administrador', description: 'Acceso a todo.', permissions: ALL_PERMISSIONS },
  {
    id: 'role-security',
    name: 'Oficial de seguridad de la información',
    description: 'Gestiona usuarios y restablece contraseñas.',
    permissions: ['users.manage', 'audit.view'],
  },
  {
    id: 'role-manager',
    name: 'Jefatura',
    description: 'Publica los documentos de su área en la intranet.',
    permissions: ['documents.publish'],
  },
  {
    id: 'role-publications',
    name: 'Aprobador de publicaciones',
    description: 'Aprueba u observa los documentos que las áreas envían a la intranet y mantiene el mapa de procesos.',
    permissions: ['documents.approve', 'intranet.configure'],
  },
  {
    id: 'role-staff',
    name: 'Colaborador',
    description: 'Consulta los documentos publicados en la intranet.',
    permissions: [],
  },
]

const DEMO_USERS: [id: string, email: string, fullName: string, roleId: string][] = [
  ['user-admin', 'admin@demo.ec', 'Andrea Admin', 'role-admin'],
  ['user-security', 'oficial@demo.ec', 'Óscar Oficial', 'role-security'],
  ['user-manager', 'jefatura@demo.ec', 'Javier Jefatura', 'role-manager'],
  ['user-publications', 'aprobador@demo.ec', 'Paula Publicaciones', 'role-publications'],
  ['user-staff', 'colaborador@demo.ec', 'Carlos Colaborador', 'role-staff'],
  // Compañeros ficticios (rol Colaborador) para que la intranet y los cumpleaños se vean con datos.
  ['user-colleague-1', 'maria.guaman@demo.ec', 'María Guamán', 'role-staff'],
  ['user-colleague-2', 'diego.lascano@demo.ec', 'Diego Lascano', 'role-staff'],
  ['user-colleague-3', 'gabriela.naranjo@demo.ec', 'Gabriela Naranjo', 'role-staff'],
  ['user-colleague-4', 'luis.mora@demo.ec', 'Luis Mora', 'role-staff'],
  ['user-colleague-5', 'veronica.pazmino@demo.ec', 'Verónica Pazmiño', 'role-staff'],
  ['user-colleague-6', 'santiago.chicaiza@demo.ec', 'Santiago Chicaiza', 'role-staff'],
  ['user-colleague-7', 'daniela.villacis@demo.ec', 'Daniela Villacís', 'role-staff'],
  ['user-colleague-8', 'jorge.toapanta@demo.ec', 'Jorge Toapanta', 'role-staff'],
  ['user-colleague-9', 'patricia.sanchez@demo.ec', 'Patricia Sánchez', 'role-staff'],
]

/**
 * Cumpleaños de ejemplo, en días contados desde que se crean los datos, para
 * que la celebración y la tarjeta de cumpleaños tengan qué mostrar.
 */
const DEMO_BIRTHDAY_OFFSETS: Record<string, number> = {
  // Hoy: tres personas.
  'user-staff': 0,
  'user-colleague-1': 0,
  'user-colleague-2': 0,
  // Próximos días y semanas.
  'user-colleague-3': 1,
  'user-manager': 3,
  'user-colleague-4': 6,
  'user-colleague-5': 9,
  'user-publications': 12,
  'user-colleague-6': 18,
  'user-colleague-7': 25,
  // Fuera de los 30 días: no aparecen en la lista.
  'user-security': 40,
  'user-colleague-8': 75,
  // Sin cumpleaños, para probar el registro: Andrea Admin y Patricia Sánchez.
}

/**
 * Peinado del retrato ilustrado de cada usuario (0 corto, 1 largo, 2 recogido).
 * Quien no está no tiene foto, para ver cómo queda con sus iniciales.
 */
const DEMO_PHOTO_STYLE: Record<string, number> = {
  'user-security': 0,
  'user-manager': 0,
  'user-publications': 1,
  'user-staff': 0,
  'user-colleague-1': 2,
  'user-colleague-3': 1,
  'user-colleague-4': 0,
  'user-colleague-5': 1,
  'user-colleague-6': 0,
  'user-colleague-7': 2,
  'user-colleague-8': 0,
  'user-colleague-9': 1,
}

function birthdayIn(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const MANAGER = 'user-manager'
const APPROVER = 'user-publications'

/** Arma la base de datos inicial del backend local. */
export function createSeed(): Db {
  return {
    roles: DEFAULT_ROLES.map((role) => ({ ...role, system: true })),
    users: DEMO_USERS.map(([id, email, fullName, roleId], index) => ({
      id,
      email,
      fullName,
      roleId,
      active: true,
      mustChangePassword: true,
      birthday: id in DEMO_BIRTHDAY_OFFSETS ? birthdayIn(DEMO_BIRTHDAY_OFFSETS[id]) : null,
      // "demo:<n>:<peinado>": retrato ilustrado (src/backend/local/demoPhotos.ts).
      photo: id in DEMO_PHOTO_STYLE ? `demo:${index}:${DEMO_PHOTO_STYLE[id]}` : null,
      password: DEMO_PASSWORD,
    })),
    processes: seedProcesses(),
    documentTypes: seedDocumentTypes(),
    documents: seedDocuments(MANAGER, APPROVER),
    sessionUserId: null,
    sessionStartedAt: null,
    // En la demostración, la verificación en dos pasos es opcional para no exigir una aplicación al probar.
    // Se cambia en Seguridad > Políticas. En Supabase, por defecto es obligatoria para quien gestiona usuarios o roles.
    settings: { mfaPolicy: 'off' },
    audit: [],
  }
}
