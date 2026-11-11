import type { AuditAction, MfaPolicy, Permission, Role } from './types.ts'

/* Auditoría y verificación en dos pasos: textos y reglas compartidas. */

/** Texto de cada acción del registro y su grupo (para filtrar). */
export const AUDIT_ACTIONS: Record<AuditAction, { name: string; group: AuditGroup }> = {
  'session.login': { name: 'Ingresó', group: 'session' },
  'session.logout': { name: 'Salió', group: 'session' },
  'session.expired': { name: 'Sesión cerrada por tiempo', group: 'session' },
  'password.changed': { name: 'Cambió su contraseña', group: 'session' },
  'mfa.enabled': { name: 'Activó la verificación en dos pasos', group: 'session' },
  'mfa.disabled': { name: 'Desactivó la verificación en dos pasos', group: 'session' },
  'mfa.reset': { name: 'Restableció la verificación en dos pasos de', group: 'users' },
  'user.created': { name: 'Creó al usuario', group: 'users' },
  'user.updated': { name: 'Modificó al usuario', group: 'users' },
  'user.password_reset': { name: 'Restableció la contraseña de', group: 'users' },
  'role.saved': { name: 'Guardó el rol', group: 'users' },
  'role.deleted': { name: 'Eliminó el rol', group: 'users' },
  'document.submitted': { name: 'Envió a aprobación', group: 'documents' },
  'document.approved': { name: 'Aprobó y publicó', group: 'documents' },
  'document.rejected': { name: 'Observó', group: 'documents' },
  'document.archived': { name: 'Retiró', group: 'documents' },
  'document.deleted': { name: 'Eliminó el documento', group: 'documents' },
  'document.viewed': { name: 'Abrió en el visor', group: 'reads' },
  'document.downloaded': { name: 'Descargó', group: 'reads' },
  'catalog.changed': { name: 'Cambió el mapa de procesos o los tipos', group: 'settings' },
  'institution.changed': { name: 'Cambió la identidad institucional', group: 'settings' },
  'settings.changed': { name: 'Cambió la configuración de seguridad', group: 'settings' },
}

export type AuditGroup = 'session' | 'users' | 'documents' | 'reads' | 'settings'

export const AUDIT_GROUPS: Record<AuditGroup, string> = {
  session: 'Ingresos y sesión',
  users: 'Usuarios y roles',
  documents: 'Publicación de documentos',
  reads: 'Lectura y descarga',
  settings: 'Configuración',
}

/** Permisos que dan control sobre el acceso de otros: con la política "privileged" exigen verificación en dos pasos. */
export const PRIVILEGED_PERMISSIONS: Permission[] = ['users.manage', 'roles.manage']

/** `short`: el texto que queda en la auditoría (la base de datos usa los mismos). */
export const MFA_POLICIES: Record<MfaPolicy, { name: string; short: string; detail: string }> = {
  off: { name: 'Opcional', short: 'opcional', detail: 'Cada usuario decide si la activa desde Mi perfil.' },
  privileged: {
    name: 'Obligatoria para quien gestiona usuarios o roles',
    short: 'obligatoria para gestores de usuarios y roles',
    detail: 'Recomendada. Protege las cuentas que pueden dar acceso a otros. Los demás pueden activarla si quieren.',
  },
  all: { name: 'Obligatoria para todos', short: 'obligatoria para todos', detail: 'Todos los usuarios deben configurarla en su próximo ingreso.' },
}

/**
 * ¿La política le exige verificación en dos pasos a este rol? La misma regla
 * está en la base de datos (función mfa_required).
 */
export function mfaRequired(policy: MfaPolicy, role: Pick<Role, 'permissions'>): boolean {
  if (policy === 'all') return true
  if (policy === 'privileged') return role.permissions.some((p) => PRIVILEGED_PERMISSIONS.includes(p))
  return false
}
