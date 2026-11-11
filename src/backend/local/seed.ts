import type { DocumentType, IntranetDocument, Permission, ProcessNode, Role, User } from '../../domain/types.ts'
import { ALL_PERMISSIONS } from '../../domain/labels.ts'
import { seedDocuments, seedDocumentTypes, seedProcesses } from './intranetSeed.ts'

/* Datos de ejemplo del backend local: roles, un usuario por rol, el mapa de procesos y documentos de la intranet. */

export type StoredUser = User & { password: string }

export interface Db {
  roles: Role[]
  users: StoredUser[]
  documents: IntranetDocument[]
  processes: ProcessNode[]
  documentTypes: DocumentType[]
  sessionUserId: string | null
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
    permissions: ['users.manage'],
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
]

const MANAGER = 'user-manager'
const APPROVER = 'user-publications'

/** Arma la base de datos inicial del backend local. */
export function createSeed(): Db {
  return {
    roles: DEFAULT_ROLES.map((role) => ({ ...role, system: true })),
    users: DEMO_USERS.map(([id, email, fullName, roleId]) => ({
      id,
      email,
      fullName,
      roleId,
      active: true,
      mustChangePassword: true,
      password: DEMO_PASSWORD,
    })),
    processes: seedProcesses(),
    documentTypes: seedDocumentTypes(),
    documents: seedDocuments(MANAGER, APPROVER),
    sessionUserId: null,
  }
}
