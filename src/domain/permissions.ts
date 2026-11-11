import type { Permission, Role, Session, User } from './types.ts'

/*
 * Nadie otorga lo que no tiene. Es la regla que evita la escalada de
 * privilegios al gestionar usuarios y roles: la usan las pantallas y el backend
 * local, y la migración 20261201000300_security.sql la repite en la base de
 * datos (can_grant_role y los disparadores de profiles y roles). Si cambia
 * aquí, cambia allá.
 */

/** ¿El usuario en sesión tiene todos estos permisos? */
export const hasAllPermissions = (permissions: Permission[], session: Session) => permissions.every((p) => session.role.permissions.includes(p))

/**
 * Puede asignar este rol (a un usuario nuevo o a uno existente) o editarlo:
 * solo si el rol no da permisos que él no tenga. Sin esto, quien gestiona
 * usuarios podría crearse una cuenta de administrador.
 */
export const canGrantRole = (role: Pick<Role, 'permissions'>, session: Session) => hasAllPermissions(role.permissions, session)

/**
 * Puede editar al usuario, cambiarle la foto o restablecer su contraseña:
 * solo si el rol actual de ese usuario no tiene más permisos que los suyos. Así
 * nadie toma la cuenta de alguien con más permisos restableciendo su contraseña.
 * Su propia cuenta siempre la gestiona (salvo cambiarse el rol).
 */
export function canManageUser(user: Pick<User, 'id' | 'roleId'>, roles: Role[], session: Session): boolean {
  if (user.id === session.user.id) return true
  const role = roles.find((r) => r.id === user.roleId)
  return !!role && canGrantRole(role, session)
}

/** Los permisos que puede incluir en un rol: los suyos. */
export const grantablePermissions = (session: Session): Permission[] => session.role.permissions
