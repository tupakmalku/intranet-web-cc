import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AuthProvider from './context/AuthProvider.tsx'
import SessionGuard from './components/SessionGuard.tsx'
import ToastProvider from './context/ToastProvider.tsx'
import { useAuth } from './context/auth.ts'
import AppLayout from './pages/AppLayout.tsx'
import IngresoPage from './pages/IngresoPage.tsx'
import InstitucionPage from './pages/InstitucionPage.tsx'
import IntranetPage from './pages/IntranetPage.tsx'
import PrimerIngresoPage from './pages/PrimerIngresoPage.tsx'
import VerificacionPage from './pages/VerificacionPage.tsx'
import AuditoriaPage from './pages/AuditoriaPage.tsx'
import PoliticasPage from './pages/PoliticasPage.tsx'
import RolesPage from './pages/RolesPage.tsx'
import SeguridadPage from './pages/SeguridadPage.tsx'
import UsuariosPage from './pages/UsuariosPage.tsx'
import { VIEW_PATHS } from './pages/intranetViews.ts'

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
  // La caducidad de la sesión rige desde el ingreso, también en el cambio de la contraseña temporal.
  const guard = <SessionGuard key={session.startedAt} startedAt={session.startedAt} />
  if (session.user.mustChangePassword) {
    return (
      <>
        {guard}
        <PrimerIngresoPage />
      </>
    )
  }

  // Verificación en dos pasos: si tiene la aplicación configurada, o si la política se la exige, hace falta el código.
  if ((session.mfa.enrolled || session.mfa.required) && !session.mfa.verified) {
    return (
      <>
        {guard}
        <VerificacionPage />
      </>
    )
  }

  const can = (permission: string) => (session.role.permissions as string[]).includes(permission)
  return (
    <>
      {guard}
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<IntranetPage view="mapa" />} />
          <Route path="intranet" element={<LegacyIntranetRedirect />} />
          <Route path="institucion" element={<InstitucionPage />} />
          {can('documents.publish') && <Route path={VIEW_PATHS.mios.slice(1)} element={<IntranetPage view="mios" />} />}
          {can('documents.approve') && <Route path={VIEW_PATHS.aprobar.slice(1)} element={<IntranetPage view="aprobar" />} />}
          {can('intranet.configure') && <Route path={VIEW_PATHS.config.slice(1)} element={<IntranetPage view="config" />} />}
          {(can('users.manage') || can('roles.manage') || can('audit.view')) && (
            <Route path="seguridad" element={<SeguridadPage />}>
              <Route index element={<Navigate to={can('users.manage') ? 'usuarios' : can('roles.manage') ? 'roles' : 'auditoria'} replace />} />
              {can('users.manage') && <Route path="usuarios" element={<UsuariosPage />} />}
              {can('roles.manage') && <Route path="roles" element={<RolesPage />} />}
              {can('roles.manage') && <Route path="politicas" element={<PoliticasPage />} />}
              {can('audit.view') && <Route path="auditoria" element={<AuditoriaPage />} />}
            </Route>
          )}
          {/* Direcciones anteriores a la sección Seguridad. */}
          <Route path="usuarios" element={<Navigate to="/seguridad/usuarios" replace />} />
          <Route path="roles" element={<Navigate to="/seguridad/roles" replace />} />
          {/* Una dirección desconocida, o de una sección que el rol no permite, lleva a la intranet. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
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
