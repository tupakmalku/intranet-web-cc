import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { backend } from '../backend/index.ts'
import { brand } from '../brand/index.ts'
import BrandMark from '../components/BrandMark.tsx'
import Icon, { type IconName } from '../components/ui/Icon.tsx'
import Modal from '../components/ui/Modal.tsx'
import { useAuth, useSession } from '../context/auth.ts'
import type { LayoutContext } from '../context/layout.ts'
import { useToast } from '../context/toasts.ts'
import type { Permission } from '../domain/types.ts'
import CambioClaveForm from '../forms/CambioClaveForm.tsx'
import Button from '../components/ui/Button.tsx'
import { useQuery } from '../lib/useQuery.ts'
import { VIEW_PATHS } from './intranetViews.ts'

interface Section {
  path: string
  title: string
  /** Nombre corto para el menú. */
  menu: string
  icon: IconName
  /** Permisos que dan acceso a la sección (basta uno). Sin ellos, la ven todos. */
  permission?: Permission | Permission[]
  /** Contador que se muestra junto al nombre en el menú. */
  count?: keyof DocumentCounts
  /** Pertenece a la intranet: ahí el buscador va en la cabecera y se puede publicar conservando la carpeta abierta. */
  intranet?: boolean
}

interface DocumentCounts {
  mine: number
  toReview: number
}

/** Secciones del menú. Las de la intranet son sus vistas (src/pages/intranetViews.ts); App.tsx crea las rutas según los mismos permisos. */
const SECTIONS: Section[] = [
  { path: VIEW_PATHS.mapa, title: 'Intranet', menu: 'Intranet', icon: 'folder', intranet: true },
  { path: VIEW_PATHS.mios, title: 'Mis documentos', menu: 'Mis documentos', icon: 'file', permission: 'documents.publish', count: 'mine', intranet: true },
  { path: VIEW_PATHS.aprobar, title: 'Por aprobar', menu: 'Por aprobar', icon: 'tasks', permission: 'documents.approve', count: 'toReview', intranet: true },
  { path: VIEW_PATHS.config, title: 'Configuración', menu: 'Configuración', icon: 'layers', permission: 'intranet.configure', intranet: true },
  { path: '/usuarios', title: 'Usuarios', menu: 'Usuarios', icon: 'people', permission: 'users.manage' },
  { path: '/roles', title: 'Roles', menu: 'Roles', icon: 'shield', permission: 'roles.manage' },
]

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')

/** Estructura de la aplicación: menú lateral, cabecera con el usuario y el contenido de cada sección. */
export default function AppLayout() {
  const { signOut } = useAuth()
  const { user, role, can } = useSession()
  const toast = useToast()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [changingPassword, setChangingPassword] = useState(false)
  const [topbarSlot, setTopbarSlot] = useState<HTMLElement | null>(null)

  // Contadores del menú. La intranet pide recontarlos (refreshCounts) cada vez que cambia un documento.
  const canPublish = can('documents.publish')
  const counted = canPublish || can('documents.approve')
  const counts = useQuery(async (): Promise<DocumentCounts | null> => {
    if (!counted) return null
    const documents = await backend.documents.list()
    return {
      mine: documents.filter((d) => d.ownerId === user.id).length,
      toReview: documents.filter((d) => d.status === 'pending').length,
    }
  }, [user.id, counted])

  // Al salir se vuelve al inicio: quien ingrese después no debe caer en la pantalla del usuario anterior.
  async function leave() {
    await signOut()
    navigate('/', { replace: true })
  }

  const sections = SECTIONS.filter((s) => !s.permission || [s.permission].flat().some((p) => can(p)))
  // La sección activa es la de ruta más larga que coincide: "/usuarios/x" pertenece a "/usuarios".
  const current = [...SECTIONS].reverse().find((s) => pathname === s.path || pathname.startsWith(`${s.path}/`)) ?? SECTIONS[0]

  /** Abre el formulario de publicar (?publicar=1). Dentro de la intranet conserva la vista y la carpeta abiertas, que el formulario usa como punto de partida. */
  function publish() {
    const params = new URLSearchParams(current.intranet ? search : '')
    params.set('publicar', '1')
    navigate({ pathname: current.intranet ? pathname : VIEW_PATHS.mapa, search: `?${params}` })
  }

  return (
    <div className="app">
      <aside className="sidebar">
        {brand.logo ? (
          // El logotipo ya lleva el nombre de la institución: debajo va solo el de la aplicación.
          <div className="brand brand-logo">
            <BrandMark size={116} />
            <strong>{brand.appName}</strong>
          </div>
        ) : (
          <div className="brand">
            <BrandMark />
            <span>
              <strong>{brand.appName}</strong>
              {brand.shortName}
            </span>
          </div>
        )}
        {canPublish && (
          <Button icon="upload" onClick={publish} className="sidebar-publish">
            Publicar documento
          </Button>
        )}
        <nav className="menu" aria-label="Secciones">
          {sections.map((section) => {
            const count = section.count && counts.data ? counts.data[section.count] : undefined
            return (
              <NavLink key={section.path} to={section.path} end={section.path === '/'}>
                <Icon name={section.icon} />
                <span className="menu-label">{section.menu}</span>
                {count !== undefined && (
                  <span className="menu-count" aria-label={`${count} documentos`}>
                    {count}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <p className="sidebar-slogan">{brand.slogan}</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{current.title}</h1>
          {/* Espacio para que la sección ponga aquí su buscador (con createPortal); si lo usa, el título queda solo para lectores de pantalla. */}
          <div className="topbar-slot" ref={setTopbarSlot} />
          <div className="topbar-user">
            <span className="topbar-user-text">
              <strong>{user.fullName}</strong>
              <small>{role.name}</small>
            </span>
            <span className="avatar" aria-hidden="true">
              {initials(user.fullName)}
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={() => setChangingPassword(true)}
              aria-label="Cambiar mi contraseña"
              title="Cambiar mi contraseña"
            >
              <Icon name="key" />
            </button>
            <button type="button" className="icon-button" onClick={leave} aria-label="Salir" title="Salir">
              <Icon name="signOut" />
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet context={{ topbarSlot, refreshCounts: counts.reload } satisfies LayoutContext} />
        </main>
      </div>

      {changingPassword && (
        <Modal title="Cambiar mi contraseña" onClose={() => setChangingPassword(false)}>
          <CambioClaveForm
            onDone={() => {
              setChangingPassword(false)
              toast('Contraseña cambiada')
            }}
            secondaryAction={
              <Button variant="text" onClick={() => setChangingPassword(false)}>
                Cancelar
              </Button>
            }
          />
        </Modal>
      )}
    </div>
  )
}
