# Ejecutar la demostración

Archivo solo para el equipo de desarrollo: la pantalla de ingreso ya no muestra estos datos al usuario final.

```bash
npm install
npm run dev
```

Sin `.env.local` (o con `VITE_BACKEND=local`) la aplicación arranca en **modo de demostración**: los datos se guardan solo en el navegador (`localStorage`, clave `intranet.local.v1`, y los archivos en IndexedDB).

## Usuarios

Todos con la contraseña temporal `Temporal.2026` (definida en `src/backend/local/seed.ts`, `DEMO_PASSWORD`). La aplicación obliga a cambiarla en el primer ingreso.

| Usuario              |
| -------------------- |
| `admin@demo.ec`      |
| `oficial@demo.ec`    |
| `jefatura@demo.ec`   |
| `aprobador@demo.ec`  |
| `colaborador@demo.ec`|

## Empezar de cero

Borra los datos del sitio en el navegador (DevTools → Aplicación → Borrar datos del sitio).
