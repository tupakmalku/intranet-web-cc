import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { backend } from '../backend/index.ts'
import type { IntranetCatalog } from '../components/intranet/catalog.ts'
import DocumentDetail from '../components/intranet/DocumentDetail.tsx'
import DocumentTable from '../components/intranet/DocumentTable.tsx'
import DocumentViewer from '../components/intranet/DocumentViewer.tsx'
import IntranetSettings from '../components/intranet/IntranetSettings.tsx'
import ProcessMap from '../components/intranet/ProcessMap.tsx'
import ProcessView from '../components/intranet/ProcessView.tsx'
import Button from '../components/ui/Button.tsx'
import EmptyState from '../components/ui/EmptyState.tsx'
import Icon from '../components/ui/Icon.tsx'
import { useSession } from '../context/auth.ts'
import { useToast } from '../context/toasts.ts'
import { documentAccess } from '../domain/documents.ts'
import { processPath } from '../domain/processes.ts'
import type { IntranetDocument } from '../domain/types.ts'
import DocumentoForm from '../forms/DocumentoForm.tsx'
import { errorMessage } from '../lib/errors.ts'
import { saveFile } from '../lib/files.ts'
import { useQuery } from '../lib/useQuery.ts'

/** Vistas de la intranet. Van en la dirección (?vista=), junto con el proceso y la carpeta abiertos. */
type Tab = 'mapa' | 'mios' | 'aprobar' | 'config'

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Intranet: los documentos institucionales ordenados según el mapa de
 * procesos. La portada es el mapa; cada proceso tiene sus carpetas (una por
 * tipo de documento). Cada usuario ve lo que permite la clasificación de cada
 * documento. Las jefaturas suben documentos, el aprobador los publica y quien
 * configura la intranet mantiene el mapa y los tipos.
 */
export default function IntranetPage() {
  const session = useSession()
  const { user, can } = session
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<IntranetDocument | null>(null)
  const [creating, setCreating] = useState(false)
  const [actionError, setActionError] = useState('')

  const query = useQuery(async () => {
    const [documents, processes, types, roles, users] = await Promise.all([
      backend.documents.list(),
      backend.processes.list(),
      backend.documentTypes.list(),
      backend.roles.list(),
      backend.users.list(),
    ])
    const catalog: IntranetCatalog = { processes, types, roles, names: new Map(users.map((u) => [u.id, u.fullName])) }
    return { documents, catalog }
  }, [])

  if (query.error) return <p className="notice notice-error">{query.error}</p>
  if (!query.data) return <p className="loading">Cargando…</p>

  const { documents, catalog } = query.data
  const canPublish = can('documents.publish')
  const canApprove = can('documents.approve')
  const canConfigure = can('intranet.configure')
  const published = documents.filter((d) => d.status === 'published')
  const mine = documents.filter((d) => d.ownerId === user.id)
  const toReview = documents.filter((d) => d.status === 'pending')

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'mapa', label: 'Mapa de procesos' },
    ...(canPublish ? [{ id: 'mios' as const, label: 'Mis documentos', count: mine.length }] : []),
    ...(canApprove ? [{ id: 'aprobar' as const, label: 'Por aprobar', count: toReview.length }] : []),
    ...(canConfigure ? [{ id: 'config' as const, label: 'Configuración' }] : []),
  ]
  const requested = params.get('vista') as Tab | null
  const tab: Tab = tabs.some((t) => t.id === requested) ? requested! : 'mapa'
  const processId = params.get('proceso')
  const typeId = params.get('tipo')

  /** Cambia de vista, proceso o carpeta dejando rastro en el historial (el botón atrás funciona). */
  function go(next: { vista?: Tab; proceso?: string | null; tipo?: string | null }) {
    const entries = Object.entries({ vista: next.vista === 'mapa' ? null : next.vista, proceso: next.proceso, tipo: next.tipo }).filter(
      (entry): entry is [string, string] => !!entry[1],
    )
    setParams(new URLSearchParams(entries))
    setSearch('')
  }

  async function download(document: IntranetDocument) {
    setActionError('')
    try {
      saveFile(await backend.documents.getFile(document), document.fileName)
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  const words = normalize(search).split(/\s+/).filter(Boolean)
  const matches = (d: IntranetDocument) => {
    const processText = processPath(catalog.processes, d.processId)
      .map((p) => `${p.code} ${p.name}`)
      .join(' ')
    const typeName = catalog.types.find((t) => t.id === d.typeId)?.name ?? ''
    const haystack = normalize(`${d.code} ${d.title} ${d.description} ${d.fileName} ${typeName} ${processText}`)
    return words.every((word) => haystack.includes(word))
  }
  const tableActions = { catalog, onOpen: (d: IntranetDocument) => setSelectedId(d.id), onRead: setViewing, onDownload: download }
  const selected = documents.find((d) => d.id === selectedId)

  function content() {
    if (tab === 'config') return <IntranetSettings catalog={catalog} documents={documents} onChanged={query.reload} />

    if (tab === 'mios' || tab === 'aprobar') {
      const list = (tab === 'mios' ? mine : toReview).filter(matches)
      if (list.length) return <DocumentTable documents={list} showProcess showStatus showOwner={tab === 'aprobar'} {...tableActions} />
      return words.length ? (
        <EmptyState title="Nada que mostrar aquí">Ningún documento coincide con la búsqueda.</EmptyState>
      ) : tab === 'mios' ? (
        <EmptyState title="No has subido documentos">Los documentos que envíes a aprobación aparecerán aquí con su estado.</EmptyState>
      ) : (
        <EmptyState title="Nada por aprobar">Cuando un área envíe un documento a la intranet, aparecerá aquí para revisarlo.</EmptyState>
      )
    }

    // Mapa de procesos: con texto de búsqueda se buscan los documentos de todos los procesos.
    if (words.length) {
      const found = published.filter(matches)
      return found.length ? (
        <DocumentTable documents={found} showProcess {...tableActions} />
      ) : (
        <EmptyState title="Sin resultados">Ningún documento publicado coincide con la búsqueda. Prueba con otras palabras.</EmptyState>
      )
    }
    if (processId) {
      return (
        <ProcessView
          catalog={catalog}
          documents={published}
          processId={processId}
          typeId={typeId}
          onNavigate={(proceso, tipo) => go({ proceso, tipo })}
          onOpenDocument={tableActions.onOpen}
          onRead={setViewing}
          onDownload={download}
        />
      )
    }
    return <ProcessMap catalog={catalog} documents={published} onOpen={(proceso, tipo) => go({ proceso, tipo })} />
  }

  return (
    <>
      {tabs.length > 1 && (
        <div className="tabs" role="tablist" aria-label="Vistas de la intranet">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} className={t.id === tab ? 'active' : ''} onClick={() => go({ vista: t.id })}>
              {t.label}
              {t.count !== undefined && ` (${t.count})`}
            </button>
          ))}
        </div>
      )}

      {tab !== 'config' && (
        <div className="toolbar toolbar-spread intranet-toolbar">
          <label className="input-box search-box">
            <Icon name="search" size={18} />
            <span className="sr-only">Buscar documentos</span>
            <input
              type="search"
              placeholder={tab === 'mapa' ? 'Buscar en toda la intranet: código, título, proceso…' : 'Buscar por código, título o proceso'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {canPublish && (
            <Button icon="upload" onClick={() => setCreating(true)} className="toolbar-push">
              Publicar documento
            </Button>
          )}
        </div>
      )}

      {actionError && (
        <p className="notice notice-error" role="alert">
          {actionError}
        </p>
      )}

      {content()}

      {selected && <DocumentDetail document={selected} catalog={catalog} onChanged={query.reload} onClose={() => setSelectedId(null)} />}

      {viewing && <DocumentViewer document={viewing} canDownload={documentAccess(viewing, session).download} onClose={() => setViewing(null)} />}

      {creating && (
        <DocumentoForm
          catalog={catalog}
          // Desde una carpeta abierta, el documento nuevo empieza en ese proceso y ese tipo.
          initialProcessId={tab === 'mapa' ? processId : null}
          initialTypeId={tab === 'mapa' ? typeId : null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            toast('Documento enviado a aprobación')
            go({ vista: 'mios' })
            query.reload()
          }}
        />
      )}
    </>
  )
}
