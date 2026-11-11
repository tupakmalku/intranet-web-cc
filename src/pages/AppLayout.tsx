import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { brand } from '../brand/index.ts'
import BrandMark from '../components/BrandMark.tsx'
import Icon, { type IconName } from '../components/ui/Icon.tsx'
import Modal from '../components/ui/Modal.tsx'
import { useAuth, useSession } from '../context/auth.ts'
import { useToast } from '../context/toasts.ts'
import type { Permission } from '../domain/types.ts'
import CambioClaveForm from '../forms/CambioClaveForm.tsx'
import Button from '../components/ui/Button.tsx'

interface Section {
  path: string
  title: string
  /** Nombre corto para el menú. */
  menu: string
  icon: IconName
  /** Permisos que dan acceso a la sección (basta uno). Sin ellos, la ven todos. */
  permission?: Permission | Permission[]
}

const SECTIONS: Section[] = [
  { path: '/', title: 'Intranet', menu: 'Intranet', icon: 'folder' },
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
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [changingPassword, setChangingPassword] = useState(false)

  // Al salir se vuelve al inicio: quien ingrese después no debe caer en la pantalla del usuario anterior.
  async function leave() {
    await signOut()
    navigate('/', { replace: true })
  }

  const sections = SECTIONS.filter((s) => !s.permission || [s.permission].flat().some((p) => can(p)))
  // La sección activa es la de ruta más larga que coincide: "/usuarios/x" pertenece a "/usuarios".
  const current = [...SECTIONS].reverse().find((s) => pathname === s.path || pathname.startsWith(`${s.path}/`)) ?? SECTIONS[0]

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
        <nav className="menu" aria-label="Secciones">
          {sections.map((section) => (
            <NavLink key={section.path} to={section.path} end={section.path === '/'}>
              <Icon name={section.icon} />
              {section.menu}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p className="sidebar-slogan">{brand.slogan}</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{current.title}</h1>
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
          <Outlet />
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
