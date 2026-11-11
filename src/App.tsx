import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AuthProvider from './context/AuthProvider.tsx'
import ToastProvider from './context/ToastProvider.tsx'
import { useAuth } from './context/auth.ts'
import AppLayout from './pages/AppLayout.tsx'
import IngresoPage from './pages/IngresoPage.tsx'
import IntranetPage from './pages/IntranetPage.tsx'
import PrimerIngresoPage from './pages/PrimerIngresoPage.tsx'
import RolesPage from './pages/RolesPage.tsx'
import UsuariosPage from './pages/UsuariosPage.tsx'

/** Lleva la dirección /intranet (la que tenía el módulo dentro de Compliance 365) al inicio, con su vista. */
function LegacyIntranetRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/${search}`} replace />
}

/**
 * Decide qué se muestra según la sesión: el ingreso, el cambio obligatorio de
 * la contraseña temporal o la aplicación con las secciones que el rol permite.
 */
function Screens() {
  const { session } = useAuth()
  if (!session) return <IngresoPage />
  if (session.user.mustChangePassword) return <PrimerIngresoPage />

  const can = (permission: string) => (session.role.permissions as string[]).includes(permission)
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<IntranetPage />} />
        <Route path="intranet" element={<LegacyIntranetRedirect />} />
        {can('users.manage') && <Route path="usuarios" element={<UsuariosPage />} />}
        {can('roles.manage') && <Route path="roles" element={<RolesPage />} />}
        {/* Una dirección desconocida, o de una sección que el rol no permite, lleva a la intranet. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Screens />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
