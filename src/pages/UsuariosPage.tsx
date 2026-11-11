import { useState } from 'react'
import { backend } from '../backend/index.ts'
import TemporaryPassword from '../components/TemporaryPassword.tsx'
import Button from '../components/ui/Button.tsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.tsx'
import Icon from '../components/ui/Icon.tsx'
import StatusBadge from '../components/ui/StatusBadge.tsx'
import { useSession } from '../context/auth.ts'
import { useToast } from '../context/toasts.ts'
import type { User } from '../domain/types.ts'
import UsuarioForm from '../forms/UsuarioForm.tsx'
import { useQuery } from '../lib/useQuery.ts'

/** Gestión de usuarios: crearlos, cambiar su rol, habilitarlos y restablecer contraseñas. */
export default function UsuariosPage() {
  const session = useSession()
  const toast = useToast()
  // Undefined: el formulario está cerrado. Null: se crea un usuario nuevo.
  const [editing, setEditing] = useState<User | null | undefined>(undefined)
  const [resetting, setResetting] = useState<User | null>(null)
  const [secret, setSecret] = useState<{ userName: string; password: string } | null>(null)
  const query = useQuery(async () => {
    const [users, roles] = await Promise.all([backend.users.list(), backend.roles.list()])
    return { users, roles }
  }, [])

  if (query.error) return <p className="notice notice-error">{query.error}</p>
  if (!query.data) return <p className="loading">Cargando…</p>

  const { users, roles } = query.data
  const roleName = new Map(roles.map((r) => [r.id, r.name]))

  return (
    <>
      <div className="toolbar toolbar-end">
        <Button icon="add" onClick={() => setEditing(null)}>
          Nuevo usuario
        </Button>
      </div>
      <div className="card table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={user.active ? '' : 'row-inactive'}>
                <td>
                  <span className="table-name-static">{user.fullName}</span>
                  <small>{user.email}</small>
                </td>
                <td>{roleName.get(user.roleId)}</td>
                <td>
                  <StatusBadge active={user.active} />
                  {user.active && user.mustChangePassword && <small>Con contraseña temporal</small>}
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setResetting(user)}
                      aria-label={`Restablecer la contraseña de ${user.fullName}`}
                      title="Restablecer contraseña"
                    >
                      <Icon name="key" size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setEditing(user)}
                      aria-label={`Editar a ${user.fullName}`}
                      title="Editar"
                    >
                      <Icon name="edit" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <UsuarioForm
          user={editing ?? undefined}
          roles={roles}
          isSelf={editing?.id === session.user.id}
          onClose={() => setEditing(undefined)}
          onSaved={(user, temporaryPassword) => {
            setEditing(undefined)
            toast(temporaryPassword ? 'Usuario creado' : 'Usuario guardado')
            if (temporaryPassword) setSecret({ userName: user.fullName, password: temporaryPassword })
            query.reload()
          }}
        />
      )}

      {resetting && (
        <ConfirmDialog
          title="Restablecer contraseña"
          confirmLabel="Restablecer contraseña"
          onClose={() => setResetting(null)}
          onConfirm={async () => {
            const password = await backend.users.resetPassword(resetting.id)
            setSecret({ userName: resetting.fullName, password })
            query.reload()
          }}
        >
          La contraseña actual de {resetting.fullName} dejará de funcionar. Se generará una temporal, que deberá cambiar al ingresar.
        </ConfirmDialog>
      )}

      {secret && <TemporaryPassword {...secret} onClose={() => setSecret(null)} />}
    </>
  )
}
