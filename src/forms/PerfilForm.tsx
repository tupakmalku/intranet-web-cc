import { useState } from 'react'
import { backend } from '../backend/index.ts'
import { birthdaySettings } from '../brand/index.ts'
import BirthdayField from '../components/BirthdayField.tsx'
import MfaStatus from '../components/MfaStatus.tsx'
import PhotoField from '../components/PhotoField.tsx'
import FormModal from '../components/ui/FormModal.tsx'
import { useAuth, useSession } from '../context/auth.ts'
import { useSubmit } from '../lib/useSubmit.ts'

/** Mi perfil: cada usuario pone su foto y su cumpleaños, y activa o desactiva la verificación en dos pasos. */
export default function PerfilForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const { user } = useSession()
  const { refresh } = useAuth()
  const [birthday, setBirthday] = useState(user.birthday)
  const [photo, setPhoto] = useState<Blob | null | undefined>(undefined)
  const { saving, failure, submit } = useSubmit()
  const withBirthday = birthdaySettings().enabled

  async function handleSubmit() {
    const saved = await submit(async () => {
      if (birthday !== user.birthday) await backend.auth.setMyBirthday(birthday)
      if (photo !== undefined) await backend.users.setPhoto(user.id, photo)
      await refresh()
    })
    if (saved) onDone()
  }

  return (
    <FormModal
      title="Mi perfil"
      description={
        withBirthday ? 'Tu foto y tu cumpleaños (solo día y mes) se muestran a tus compañeros en la intranet.' : 'Tu foto se muestra a tus compañeros en la intranet.'
      }
      submitLabel="Guardar"
      saving={saving}
      failure={failure}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <PhotoField user={user} value={photo} onChange={setPhoto} />
      {withBirthday && <BirthdayField id="my-birthday" value={birthday} onChange={setBirthday} />}
      <MfaStatus />
    </FormModal>
  )
}
