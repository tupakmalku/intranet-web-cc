import { useState } from 'react'
import { backend } from '../backend/index.ts'
import { sessionSettings } from '../brand/index.ts'
import Button from '../components/ui/Button.tsx'
import RadioList from '../components/ui/RadioList.tsx'
import { useAuth } from '../context/auth.ts'
import { useToast } from '../context/toasts.ts'
import { MFA_POLICIES } from '../domain/audit.ts'
import type { MfaPolicy } from '../domain/types.ts'
import { useQuery } from '../lib/useQuery.ts'
import { useSubmit } from '../lib/useSubmit.ts'

/**
 * Políticas de seguridad: la verificación en dos pasos (se guarda en el
 * servidor, que la hace cumplir) y, como referencia, la caducidad de sesión
 * (se configura por institución, en la marca).
 */
export default function PoliticasPage() {
  const toast = useToast()
  const { refresh } = useAuth()
  const settings = useQuery(() => backend.security.getSettings(), [])
  const [policy, setPolicy] = useState<MfaPolicy | null>(null)
  const { saving, failure, submit } = useSubmit()
  const session = sessionSettings()

  if (settings.error) return <p className="notice notice-error">{settings.error}</p>
  if (!settings.data) return <p className="loading">Cargando…</p>
  const current = policy ?? settings.data.mfaPolicy

  async function save() {
    const saved = await submit(async () => {
      await backend.security.saveSettings({ mfaPolicy: current })
      // Si la política nueva le exige la verificación a quien la cambió, se la pide en el acto.
      await refresh()
    })
    if (saved) {
      toast('Política guardada')
      settings.reload()
      setPolicy(null)
    }
  }

  return (
    <div className="settings-stack">
      <section className="card settings-card">
        <h2>Verificación en dos pasos</h2>
        <p className="help">
          Además de la contraseña, se pide un código de 6 dígitos de una aplicación autenticadora en el teléfono. Si alguien roba una contraseña, no le basta para
          entrar.
        </p>
        <RadioList
          name="mfa-policy"
          legend="¿A quién se le exige?"
          options={(Object.keys(MFA_POLICIES) as MfaPolicy[]).map((value) => ({ value, label: MFA_POLICIES[value].name, detail: MFA_POLICIES[value].detail }))}
          value={current}
          onChange={setPolicy}
        />
        {failure && (
          <p className="notice notice-error" role="alert">
            {failure}
          </p>
        )}
        <div className="settings-actions">
          <Button onClick={save} disabled={saving || current === settings.data.mfaPolicy}>
            Guardar política
          </Button>
        </div>
      </section>

      <section className="card settings-card">
        <h2>Caducidad de la sesión</h2>
        <dl className="settings-facts">
          <div>
            <dt>Sin actividad</dt>
            <dd>{session.idleMinutes} minutos</dd>
          </div>
          <div>
            <dt>Duración máxima</dt>
            <dd>{session.maxHours} horas</dd>
          </div>
          <div>
            <dt>Aviso previo</dt>
            <dd>{session.warningSeconds} segundos</dd>
          </div>
        </dl>
        <p className="help">Se configura por institución (clave «session» de la marca). Ver README, sección Caducidad de la sesión.</p>
      </section>
    </div>
  )
}
