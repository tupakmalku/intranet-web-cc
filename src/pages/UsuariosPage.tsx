import { useState } from 'react'
import { backend } from '../backend/index.ts'
import { birthdaySettings } from '../brand/index.ts'
import Avatar from '../components/Avatar.tsx'
import TemporaryPassword from '../components/TemporaryPassword.tsx'
import Button from '../components/ui/Button.tsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.tsx'
import Icon from '../components/ui/Icon.tsx'
import LockedAction from '../components/ui/LockedAction.tsx'
import StatusBadge from '../components/ui/StatusBadge.tsx'
import { useSession } from '../context/auth.ts'
import { useLayout } from '../context/layout.ts'
import { useToast } from '../context/toasts.ts'
import { canManageUser } from '../domain/permissions.ts'
import type { User } from '../domain/types.ts'
import UsuarioForm from '../forms/UsuarioForm.tsx'
import { formatBirthday } from '../lib/birthdays.ts'
import { useQuery } from '../lib/useQuery.ts'

/** Gestión de usuarios: crearlos, cambiar su rol, habilitarlos y restablecer contraseñas. */
export default function UsuariosPage() {
  const session = useSession()
  const toast = useToast()
  const { refreshBirthdays } = useLayout()
  const withBirthday = birthdaySettings().enabled
  // Undefined: el formulario está cerrado. Null: se crea un usuario nuevo.
  const [editing, setEditing] = useState<User | null | undefined>(undefined)
  const [resetting, setResetting] = useState<User | null>(null)
  const [resettingMfa, setResettingMfa] = useState<User | null>(null)
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
              {withBirthday && <th>Cumpleaños</th>}
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
                  <div className="user-cell">
                    <Avatar user={user} size={38} />
                    <div>
                      <span className="table-name-static">{user.fullName}</span>
                      <small>{user.email}</small>
                    </div>
                  </div>
                </td>
                <td>{roleName.get(user.roleId)}</td>
                {withBirthday && <td>{user.birthday ? formatBirthday(user.birthday) : <small>Sin registrar</small>}</td>}
                <td>
                  <StatusBadge active={user.active} />
                  {user.active && user.mustChangePassword && <small>Con contraseña temporal</small>}
                </td>
                <td>
                  <div className="table-actions">
                    {/* Nadie otorga lo que no tiene: a un usuario con más permisos no se le edita ni se le restablece la contraseña. */}
                    {!canManageUser(user, roles, session) ? (
                      <LockedAction label={`${user.fullName} tiene permisos que tú no tienes`} />
                    ) : (
                      <>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => setResetting(user)}
                          aria-label={`Restablecer la contraseña de ${user.fullName}`}
                          title="Restablecer contraseña"
                        >
                          <Icon name="key" size={18} />
                        </button>
                        {user.id !== session.user.id && (
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => setResettingMfa(user)}
                            aria-label={`Restablecer la verificación en dos pasos de ${user.fullName}`}
                            title="Restablecer verificación en dos pasos"
                          >
                            <Icon name="shield" size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => setEditing(user)}
                          aria-label={`Editar a ${user.fullName}`}
                          title="Editar"
                        >
                          <Icon name="edit" size={18} />
                        </button>
                      </>
                    )}
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
            refreshBirthdays()
          }}
        />
      )}

      {resettingMfa && (
        <ConfirmDialog
          title="Restablecer verificación en dos pasos"
          confirmLabel="Restablecer"
          onClose={() => setResettingMfa(null)}
          onConfirm={async () => {
            await backend.users.resetMfa(resettingMfa.id)
            toast('Verificación en dos pasos restablecida')
          }}
        >
          Úsalo si {resettingMfa.fullName} perdió su teléfono. Si tenía una aplicación autenticadora configurada, se quitará y deberá configurarla de nuevo al
          ingresar (si la política se lo exige). Confirma antes su identidad por otro medio.
        </ConfirmDialog>
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
