import { brand } from '../brand/index.ts'
import Icon from './ui/Icon.tsx'

/**
 * Pantalla que reemplaza a la aplicación publicada cuando no se abre por HTTPS.
 * Sin HTTPS, alguien en la misma red podría alterar la aplicación en el camino
 * y robar contraseñas o la sesión. En desarrollo no se muestra: ahí se prueba
 * desde otros dispositivos por la IP de la red.
 */
export default function InsecureConnection() {
  const secureUrl = window.location.href.replace(/^http:/, 'https:')
  return (
    <main className="insecure-connection">
      <div className="empty-state">
        <Icon name="lock" size={40} />
        <h2>Conexión no segura</h2>
        <p>
          {brand.appName} solo funciona con una conexión cifrada (HTTPS), para proteger tus contraseñas y tus datos. Ingresa con la
          dirección que empieza por <strong>https://</strong>.
        </p>
        {window.location.protocol === 'http:' && (
          <a className="button button-primary" href={secureUrl}>
            Abrir la versión segura
          </a>
        )}
      </div>
    </main>
  )
}
