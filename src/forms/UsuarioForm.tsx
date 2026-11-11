import { useState } from 'react'
import { backend } from '../backend/index.ts'
import { birthdaySettings } from '../brand/index.ts'
import BirthdayField from '../components/BirthdayField.tsx'
import PhotoField from '../components/PhotoField.tsx'
import Checkbox from '../components/ui/Checkbox.tsx'
import Field from '../components/ui/Field.tsx'
import FormModal from '../components/ui/FormModal.tsx'
import Select from '../components/ui/Select.tsx'
import type { Role, User } from '../domain/types.ts'
import { useSubmit } from '../lib/useSubmit.ts'
import { isEmail } from '../lib/validation.ts'

interface Props {
  /** El usuario a editar. Sin él, se crea uno nuevo. */
  user?: User
  roles: Role[]
  /** El usuario en sesión no puede cambiar su propio rol ni inhabilitarse. */
  isSelf: boolean
  /** Al crear, llega la contraseña temporal para entregársela al usuario. */
  onSaved: (user: User, temporaryPassword?: string) => void
  onClose: () => void
}

/** Formulario para crear o editar un usuario. Al crearlo se genera una contraseña temporal. */
export default function UsuarioForm({ user, roles, isSelf, onSaved, onClose }: Props) {
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [roleId, setRoleId] = useState(user?.roleId ?? '')
  const [active, setActive] = useState(user?.active ?? true)
  const [birthday, setBirthday] = useState(user?.birthday ?? null)
  const [photo, setPhoto] = useState<Blob | null | undefined>(undefined)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { saving, failure, submit } = useSubmit()

  async function handleSubmit() {
    const found: Record<string, string> = {}
    if (!fullName.trim()) found.fullName = 'Escribe el nombre y el apellido.'
    if (!isEmail(email.trim())) found.email = 'Escribe un correo válido, como nombre@institucion.ec.'
    if (!roleId) found.roleId = 'Elige un rol.'
    setErrors(found)
    if (Object.keys(found).length) return

    await submit(async () => {
      if (user) {
        let saved = await backend.users.update(user.id, { fullName, roleId, active, birthday })
        if (photo !== undefined) saved = await backend.users.setPhoto(user.id, photo)
        onSaved(saved)
      } else {
        const created = await backend.users.create({ fullName, email: email.trim(), roleId, birthday })
        // La foto se sube cuando el usuario ya existe.
        const saved = photo ? await backend.users.setPhoto(created.user.id, photo) : created.user
        onSaved(saved, created.temporaryPassword)
      }
    })
  }

  return (
    <FormModal
      title={user ? 'Editar usuario' : 'Nuevo usuario'}
      description={user ? undefined : 'Se generará una contraseña temporal, que deberá cambiar en su primer ingreso.'}
      submitLabel={user ? 'Guardar usuario' : 'Crear usuario'}
      saving={saving}
      failure={failure}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <PhotoField user={{ id: user?.id ?? '', fullName: fullName || '?', photo: user?.photo ?? null }} value={photo} onChange={setPhoto} />
      <Field
        id="user-name"
        label="Nombre completo"
        icon="person"
        autoComplete="off"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={errors.fullName}
      />
      <Field
        id="user-email"
        label="Correo"
        icon="mail"
        type="email"
        autoComplete="off"
        placeholder="nombre@institucion.ec"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        // El correo identifica al usuario para ingresar: no se cambia después.
        disabled={!!user}
      />
      <Select
        id="user-role"
        label="Rol"
        icon="shield"
        emptyLabel="Elige un rol"
        options={roles.map((r) => ({ value: r.id, text: r.name }))}
        value={roleId}
        onChange={(e) => setRoleId(e.target.value)}
        error={errors.roleId}
        help={isSelf ? 'No puedes cambiar tu propio rol.' : roles.find((r) => r.id === roleId)?.description}
        disabled={isSelf}
      />
      {birthdaySettings().enabled && <BirthdayField id="user-birthday" value={birthday} onChange={setBirthday} help="Opcional. Solo día y mes." />}
      {user && (
        <Checkbox
          label="Usuario habilitado"
          detail="Un usuario inhabilitado no puede ingresar. Sus documentos se conservan."
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          disabled={isSelf}
        />
      )}
    </FormModal>
  )
}
