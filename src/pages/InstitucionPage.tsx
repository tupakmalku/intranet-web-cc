import { useState } from 'react'
import { backend } from '../backend/index.ts'
import InstitutionBlock from '../components/institution/InstitutionBlock.tsx'
import ValueChips from '../components/institution/ValueChips.tsx'
import DocumentViewer from '../components/intranet/DocumentViewer.tsx'
import Button from '../components/ui/Button.tsx'
import EmptyState from '../components/ui/EmptyState.tsx'
import { useSession } from '../context/auth.ts'
import { useToast } from '../context/toasts.ts'
import { documentAccess } from '../domain/documents.ts'
import { hasInstitutionContent } from '../domain/institution.ts'
import type { IntranetDocument } from '../domain/types.ts'
import InstitucionForm from '../forms/InstitucionForm.tsx'
import { useQuery } from '../lib/useQuery.ts'

/** Nuestra institución: misión, visión, valores y política de calidad, con el documento oficial enlazado. */
export default function InstitucionPage() {
  const session = useSession()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [viewing, setViewing] = useState<IntranetDocument | null>(null)
  const query = useQuery(async () => {
    const [profile, documents] = await Promise.all([backend.institution.get(), backend.documents.list()])
    return { profile, published: documents.filter((d) => d.status === 'published') }
  }, [])

  if (query.error) return <p className="notice notice-error">{query.error}</p>
  if (!query.data) return <p className="loading">Cargando…</p>
  const { profile, published } = query.data
  const canEdit = session.can('intranet.configure')
  const qualityDocument = profile.qualityDocumentCode ? published.find((d) => d.code === profile.qualityDocumentCode) : undefined

  return (
    <>
      {canEdit && (
        <div className="toolbar toolbar-end institution-toolbar">
          <Button icon="edit" variant="secondary" size="small" onClick={() => setEditing(true)}>
            Editar
          </Button>
        </div>
      )}

      {!hasInstitutionContent(profile) ? (
        <EmptyState title="Todavía no hay contenido" icon="building">
          {canEdit ? 'Pulsa Editar para escribir la misión, la visión, los valores y la política de calidad.' : 'La institución aún no publicó su misión y visión.'}
        </EmptyState>
      ) : (
        <div className="institution-grid">
          {profile.mission && (
            <InstitutionBlock title="Misión" icon="target">
              <p>{profile.mission}</p>
            </InstitutionBlock>
          )}
          {profile.vision && (
            <InstitutionBlock title="Visión" icon="eye">
              <p>{profile.vision}</p>
            </InstitutionBlock>
          )}
          {profile.values.length > 0 && (
            <InstitutionBlock title="Valores" icon="award" wide>
              <ValueChips values={profile.values} />
            </InstitutionBlock>
          )}
          {profile.qualityPolicy && (
            <InstitutionBlock title="Política de calidad" icon="clipboardCheck" wide>
              <p>{profile.qualityPolicy}</p>
              {qualityDocument && documentAccess(qualityDocument, session).read && (
                <Button variant="secondary" size="small" icon="file" onClick={() => setViewing(qualityDocument)}>
                  Ver documento oficial · {qualityDocument.code} v{qualityDocument.version}
                </Button>
              )}
            </InstitutionBlock>
          )}
        </div>
      )}

      {editing && (
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
      {viewing && <DocumentViewer document={viewing} canDownload={documentAccess(viewing, session).download} onClose={() => setViewing(null)} />}
    </>
  )
}
