import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { backend } from '../backend/index.ts'
import type { IntranetCatalog } from '../components/intranet/catalog.ts'
import DocumentDetail from '../components/intranet/DocumentDetail.tsx'
import DocumentTable from '../components/intranet/DocumentTable.tsx'
import DocumentViewer from '../components/intranet/DocumentViewer.tsx'
import IntranetSettings from '../components/intranet/IntranetSettings.tsx'
import ProcessMap from '../components/intranet/ProcessMap.tsx'
import ProcessView from '../components/intranet/ProcessView.tsx'
import EmptyState from '../components/ui/EmptyState.tsx'
import Icon from '../components/ui/Icon.tsx'
import { useSession } from '../context/auth.ts'
import { useLayout } from '../context/layout.ts'
import { useToast } from '../context/toasts.ts'
import { documentAccess } from '../domain/documents.ts'
import { processPath } from '../domain/processes.ts'
import type { IntranetDocument } from '../domain/types.ts'
import DocumentoForm from '../forms/DocumentoForm.tsx'
import { errorMessage } from '../lib/errors.ts'
import { saveFile } from '../lib/files.ts'
import { useQuery } from '../lib/useQuery.ts'
import { VIEW_PATHS, type IntranetView } from './intranetViews.ts'

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
export default function IntranetPage({ view }: { view: IntranetView }) {
  const session = useSession()
  const { user } = session
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<IntranetDocument | null>(null)
  const [actionError, setActionError] = useState('')
  const { topbarSlot, refreshCounts } = useLayout()

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

  // Direcciones antiguas, de cuando las vistas eran pestañas (/?vista=mios): se llevan a su sección.
  const legacyView = params.get('vista') as IntranetView | null
  if (legacyView) {
    const rest = new URLSearchParams(params)
    rest.delete('vista')
    return <Navigate to={{ pathname: VIEW_PATHS[legacyView] ?? VIEW_PATHS.mapa, search: rest.size ? `?${rest}` : '' }} replace />
  }

  if (query.error) return <p className="notice notice-error">{query.error}</p>
  if (!query.data) return <p className="loading">Cargando…</p>

  const { documents, catalog } = query.data
  const published = documents.filter((d) => d.status === 'published')
  const mine = documents.filter((d) => d.ownerId === user.id)
  const toReview = documents.filter((d) => d.status === 'pending')
  // Las vistas son secciones del menú lateral; App.tsx solo crea las que el rol permite.
  const tab = view
  const processId = params.get('proceso')
  const typeId = params.get('tipo')
  // El formulario de publicar se abre desde el menú lateral con ?publicar=1, conservando el proceso y la carpeta abiertos.
  const creating = params.has('publicar')

  /** Abre un proceso o carpeta del mapa dejando rastro en el historial (el botón atrás funciona). */
  function go(next: { proceso?: string | null; tipo?: string | null }) {
    const entries = Object.entries({ proceso: next.proceso, tipo: next.tipo }).filter((entry): entry is [string, string] => !!entry[1])
    navigate({ pathname: VIEW_PATHS.mapa, search: entries.length ? `?${new URLSearchParams(entries)}` : '' })
    setSearch('')
  }

  function closeForm() {
    const next = new URLSearchParams(params)
    next.delete('publicar')
    setParams(next, { replace: true })
  }

  /** Vuelve a leer los documentos y actualiza los contadores del menú. */
  function reload() {
    query.reload()
    refreshCounts()
  }

  async function download(document: IntranetDocument) {
    setActionError('')
    try {
      saveFile(await backend.documents.getFile(document, 'download'), document.fileName)
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  // Solo el mapa de procesos tiene buscador.
  const words = tab === 'mapa' ? normalize(search).split(/\s+/).filter(Boolean) : []
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
    if (tab === 'config') return <IntranetSettings catalog={catalog} documents={documents} onChanged={reload} />

    if (tab === 'mios' || tab === 'aprobar') {
      const list = tab === 'mios' ? mine : toReview
      if (list.length) return <DocumentTable documents={list} showProcess showStatus showOwner={tab === 'aprobar'} {...tableActions} />
      return tab === 'mios' ? (
        <EmptyState title="No has subido documentos" icon="file">Los documentos que envíes a aprobación aparecerán aquí con su estado.</EmptyState>
      ) : (
        <EmptyState title="Nada por aprobar" icon="tasks">Cuando un área envíe un documento a la intranet, aparecerá aquí para revisarlo.</EmptyState>
      )
    }

    // Mapa de procesos: con texto de búsqueda se buscan los documentos de todos los procesos.
    if (words.length) {
      const found = published.filter(matches)
      return found.length ? (
        <DocumentTable documents={found} showProcess {...tableActions} />
      ) : (
        <EmptyState title="Sin resultados" icon="search">Ningún documento publicado coincide con la búsqueda. Prueba con otras palabras.</EmptyState>
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
      {/* Solo el mapa de procesos tiene buscador: va en la cabecera, en lugar del título. Las demás vistas muestran su título. */}
      {tab === 'mapa' &&
        topbarSlot &&
        createPortal(
          <label className="input-box search-box topbar-search">
            <Icon name="search" size={18} />
            <span className="sr-only">Buscar documentos</span>
            <input
              type="search"
              placeholder="Buscar en toda la intranet: código, título, proceso…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>,
          topbarSlot,
        )}

      {actionError && (
        <p className="notice notice-error" role="alert">
          {actionError}
        </p>
      )}

      {content()}

      {selected && <DocumentDetail document={selected} catalog={catalog} onChanged={reload} onClose={() => setSelectedId(null)} />}

      {viewing && <DocumentViewer document={viewing} canDownload={documentAccess(viewing, session).download} onClose={() => setViewing(null)} />}

      {creating && (
        <DocumentoForm
          catalog={catalog}
          // Desde una carpeta abierta, el documento nuevo empieza en ese proceso y ese tipo.
          initialProcessId={tab === 'mapa' ? processId : null}
          initialTypeId={tab === 'mapa' ? typeId : null}
          onClose={closeForm}
          onSaved={() => {
            toast('Documento enviado a aprobación')
            navigate(VIEW_PATHS.mios)
            reload()
          }}
        />
      )}
    </>
  )
}
