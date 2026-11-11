import { NavLink, Outlet } from 'react-router-dom'
import { useSession } from '../context/auth.ts'
import { useLayout } from '../context/layout.ts'

/**
 * Seguridad: agrupa Usuarios y Roles en una sola sección del menú, con una
 * pestaña para cada uno. Cada pestaña es una ruta (/seguridad/usuarios,
 * /seguridad/roles) y App.tsx solo crea las que el rol permite.
 */
export default function SeguridadPage() {
  const { can } = useSession()
  // Las pestañas reciben lo que comparte la estructura (por ejemplo, refrescar los cumpleaños).
  const layout = useLayout()
  const tabs = [
    ...(can('users.manage') ? [{ path: 'usuarios', label: 'Usuarios' }] : []),
    ...(can('roles.manage') ? [{ path: 'roles', label: 'Roles' }] : []),
  ]

  return (
    <>
      <nav className="tabs" aria-label="Secciones de seguridad">
        {tabs.map((tab) => (
          <NavLink key={tab.path} to={tab.path}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet context={layout} />
    </>
  )
}
