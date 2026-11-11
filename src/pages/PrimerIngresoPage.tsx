import Button from '../components/ui/Button.tsx'
import { useAuth } from '../context/auth.ts'
import { useToast } from '../context/toasts.ts'
import CambioClaveForm from '../forms/CambioClaveForm.tsx'

/**
 * Pantalla que bloquea el paso mientras el usuario tenga una contraseña
 * temporal: en el primer ingreso y después de que se la restablezcan.
 */
export default function PrimerIngresoPage() {
  const { session, signOut, refresh } = useAuth()
  const toast = useToast()

  return (
    <div className="centered-screen">
      <main className="card gate">
        <h1>Crea tu contraseña</h1>
        <p>
          {session?.user.fullName}, estás usando una contraseña temporal. Para continuar, cámbiala por una que solo tú conozcas.
        </p>
        <CambioClaveForm
          currentLabel="Contraseña temporal"
          onDone={async () => {
            await refresh()
            toast('Contraseña cambiada')
          }}
          secondaryAction={
            <Button variant="text" onClick={() => signOut()}>
              Salir
            </Button>
          }
        />
      </main>
    </div>
  )
}
