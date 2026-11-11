import { useState } from 'react'
import { backend } from '../../backend/index.ts'
import { useToast } from '../../context/toasts.ts'
import { hasInstitutionContent, LOGIN_HIGHLIGHTS } from '../../domain/institution.ts'
import type { IntranetDocument } from '../../domain/types.ts'
import InstitucionForm from '../../forms/InstitucionForm.tsx'
import { useQuery } from '../../lib/useQuery.ts'
import Button from '../ui/Button.tsx'
import Card from '../ui/Card.tsx'
import ValueChips from './ValueChips.tsx'

interface Props {
  /** Documentos que el usuario ve: se enlaza el publicado de la política de calidad. */
  documents: IntranetDocument[]
}

/**
 * Identidad institucional dentro de Configuración: resumen de la misión, la
 * visión, los valores y la política de calidad que se muestran en la pantalla
 * de ingreso, con el botón para editarlos.
 */
export default function InstitutionSettings({ documents }: Props) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const query = useQuery(() => backend.institution.get(), [])
  const published = documents.filter((d) => d.status === 'published')
  const profile = query.data

  const texts = profile
    ? [
        { label: 'Misión', text: profile.mission },
        { label: 'Visión', text: profile.vision },
        { label: 'Política de calidad', text: profile.qualityPolicy },
      ]
    : []

  return (
    <Card
      title="Nuestra institución"
      subtitle="Misión, visión, valores y política de calidad. Se muestran en la pantalla de ingreso."
      action={
        <Button size="small" icon="edit" variant="secondary" disabled={!profile} onClick={() => setEditing(true)}>
          Editar
        </Button>
      }
    >
      {query.error && <p className="notice notice-error">{query.error}</p>}
      {profile && !hasInstitutionContent(profile) && <p className="help">Todavía no hay contenido. Pulsa Editar para escribirlo.</p>}
      {profile && hasInstitutionContent(profile) && (
        <dl className="institution-settings">
          {texts.map((t) => (
            <div key={t.label}>
              <dt>{t.label}</dt>
              <dd className="institution-settings-text">{t.text || 'Sin escribir'}</dd>
            </div>
          ))}
          <div>
            <dt>En el ingreso se muestra</dt>
            <dd>
              {LOGIN_HIGHLIGHTS[profile.loginHighlight]}
              {profile.qualityDocumentCode && <small> · Documento de la política: {profile.qualityDocumentCode}</small>}
            </dd>
          </div>
          <div className="is-wide">
            <dt>Valores</dt>
            <dd>{profile.values.length ? <ValueChips values={profile.values} /> : 'Sin escribir'}</dd>
          </div>
        </dl>
      )}

      {editing && profile && (
        <InstitucionForm
          profile={profile}
          documents={published}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            toast('Identidad institucional guardada')
            query.reload()
          }}
        />
      )}
    </Card>
  )
}
