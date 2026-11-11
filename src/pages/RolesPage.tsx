import { useState } from 'react'
import { backend } from '../backend/index.ts'
import Button from '../components/ui/Button.tsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.tsx'
import Icon from '../components/ui/Icon.tsx'
import LockedAction from '../components/ui/LockedAction.tsx'
import { useSession } from '../context/auth.ts'
import { useToast } from '../context/toasts.ts'
import { PERMISSIONS } from '../domain/labels.ts'
import { canGrantRole } from '../domain/permissions.ts'
import type { Role } from '../domain/types.ts'
import RolForm from '../forms/RolForm.tsx'
import { useQuery } from '../lib/useQuery.ts'

/** Gestión de roles: cada rol combina los permisos que necesita un tipo de usuario. */
export default function RolesPage() {
  const session = useSession()
  const toast = useToast()
  // Undefined: el formulario está cerrado. Null: se crea un rol nuevo.
  const [editing, setEditing] = useState<Role | null | undefined>(undefined)
  const [removing, setRemoving] = useState<Role | null>(null)
  const query = useQuery(async () => {
    const [roles, users] = await Promise.all([backend.roles.list(), backend.users.list()])
    return { roles, users }
  }, [])

  if (query.error) return <p className="notice notice-error">{query.error}</p>
  if (!query.data) return <p className="loading">Cargando…</p>

  const { roles, users } = query.data

  return (
    <>
      <div className="toolbar toolbar-end">
        <Button icon="add" onClick={() => setEditing(null)}>
          Nuevo rol
        </Button>
      </div>
      <div className="card table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Rol</th>
              <th>Permisos</th>
              <th className="num">Usuarios</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>
                  <span className="table-name-static">{role.name}</span>
                  <small>{role.description}</small>
                </td>
                <td>
                  <ul className="permissions">
                    {role.permissions.map((permission) => (
                      <li key={permission}>{PERMISSIONS[permission]?.name ?? permission}</li>
                    ))}
                  </ul>
                </td>
                <td className="num">{users.filter((u) => u.roleId === role.id).length}</td>
                <td>
                  <div className="table-actions">
                    {/* Nadie otorga lo que no tiene: un rol con permisos que no tiene quien mira, no lo edita ni lo elimina. */}
                    {!canGrantRole(role, session) ? (
                      <LockedAction label={`El rol ${role.name} tiene permisos que tú no tienes`} />
                    ) : (
                      <button type="button" className="icon-button" onClick={() => setEditing(role)} aria-label={`Editar el rol ${role.name}`} title="Editar">
                        <Icon name="edit" size={18} />
                      </button>
                    )}
                    {!role.system && canGrantRole(role, session) && (
                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() => setRemoving(role)}
                        aria-label={`Eliminar el rol ${role.name}`}
                        title="Eliminar"
                      >
                        <Icon name="remove" size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <RolForm
          role={editing ?? undefined}
          ownRole={editing?.id === session.role.id}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            toast('Rol guardado')
            query.reload()
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Eliminar rol"
          confirmLabel="Eliminar rol"
          danger
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await backend.roles.remove(removing.id)
            toast('Rol eliminado')
            query.reload()
          }}
        >
          Se eliminará el rol «{removing.name}». Solo se puede eliminar si ningún usuario lo tiene asignado.
        </ConfirmDialog>
      )}
    </>
  )
}
