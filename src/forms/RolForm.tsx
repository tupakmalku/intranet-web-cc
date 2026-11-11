import { useState } from 'react'
import { backend } from '../backend/index.ts'
import Checkbox from '../components/ui/Checkbox.tsx'
import Field from '../components/ui/Field.tsx'
import FormModal from '../components/ui/FormModal.tsx'
import TextArea from '../components/ui/TextArea.tsx'
import { ALL_PERMISSIONS, PERMISSIONS } from '../domain/labels.ts'
import type { Permission, Role } from '../domain/types.ts'
import { useSubmit } from '../lib/useSubmit.ts'

interface Props {
  /** El rol a editar. Sin él, se crea uno nuevo. */
  role?: Role
  /** Es el rol del usuario en sesión: no puede quitarse a sí mismo la gestión de roles. */
  ownRole?: boolean
  onSaved: () => void
  onClose: () => void
}

/** Formulario para crear o editar un rol: su nombre y lo que permite hacer. */
export default function RolForm({ role, ownRole = false, onSaved, onClose }: Props) {
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [permissions, setPermissions] = useState<Permission[]>(role?.permissions ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { saving, failure, submit } = useSubmit()

  function toggle(permission: Permission, granted: boolean) {
    setPermissions(granted ? [...permissions, permission] : permissions.filter((p) => p !== permission))
  }

  async function handleSubmit() {
    const found: Record<string, string> = {}
    if (!name.trim()) found.name = 'Escribe el nombre del rol.'
    if (!permissions.length) found.permissions = 'Marca al menos un permiso.'
    setErrors(found)
    if (Object.keys(found).length) return

    await submit(async () => {
      await backend.roles.save({ id: role?.id, name, description, permissions })
      onSaved()
    })
  }

  return (
    <FormModal
      title={role ? 'Editar rol' : 'Nuevo rol'}
      submitLabel="Guardar rol"
      saving={saving}
      failure={failure}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field id="role-name" label="Nombre" icon="shield" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <TextArea
        id="role-description"
        label="Descripción"
        rows={2}
        placeholder="Para quién es este rol."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <fieldset className="checkbox-group" aria-describedby={errors.permissions ? 'role-permissions-error' : undefined}>
        <legend>Permisos</legend>
        {ALL_PERMISSIONS.map((permission) => (
          <Checkbox
            key={permission}
            label={PERMISSIONS[permission].name}
            detail={PERMISSIONS[permission].detail}
            checked={permissions.includes(permission)}
            onChange={(e) => toggle(permission, e.target.checked)}
            disabled={ownRole && permission === 'roles.manage'}
          />
        ))}
      </fieldset>
      {errors.permissions && (
        <p className="error" id="role-permissions-error">
          {errors.permissions}
        </p>
      )}
    </FormModal>
  )
}
