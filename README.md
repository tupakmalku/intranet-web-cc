# Intranet

Intranet documental de la institución: las áreas publican sus manuales, procedimientos, políticas y anexos, ordenados según el **mapa de procesos**, con aprobación previa y permisos según la clasificación de cada documento.

Nació como un módulo de Compliance 365 y ahora es un proyecto independiente, con sus propios usuarios, roles y base de datos.

Hecha con React, TypeScript y Vite. En producción usa Supabase (base de datos, autenticación y almacenamiento de archivos); sin servidor funciona en modo de demostración.

## Ponerla en marcha

```bash
npm install
npm run dev
```

Sin configuración arranca en **modo de demostración**: los datos se guardan en el navegador e incluye el mapa de procesos de ejemplo y cuatro documentos. Usuarios: `admin`, `oficial`, `jefatura`, `aprobador` y `colaborador` `@demo.ec`, todos con la contraseña temporal `Temporal.2026`, que la aplicación obliga a cambiar en el primer ingreso.

Para empezar de cero en el modo de demostración, borra los datos del sitio en el navegador.

## Roles y permisos

Un rol es una combinación de permisos. Se crean y editan en **Seguridad > Roles** (los usuarios, en **Seguridad > Usuarios**); estos vienen creados:

| Rol | Qué puede hacer |
| --- | --- |
| Administrador | Todo. |
| Oficial de seguridad de la información | Gestionar usuarios, restablecer contraseñas y consultar la auditoría. |
| Jefatura | Publicar los documentos de su área en la intranet. |
| Aprobador de publicaciones | Aprobar u observar los documentos enviados a la intranet, retirarlos y mantener el mapa de procesos y los tipos de documento. |
| Colaborador | Consultar los documentos publicados. |

Los permisos están en `src/domain/types.ts` (`Permission`) y sus textos en `src/domain/labels.ts`.

**Nadie otorga lo que no tiene.** Solo se asigna un rol, o se crea o edita uno, si no da permisos que no tenga quien lo hace. Y solo se edita, se le cambia la foto o se le restablece la contraseña a un usuario cuyo rol no tenga más permisos. Así, quien solo gestiona usuarios (el Oficial de seguridad) no puede crear una cuenta de administrador ni tomar la de uno restableciendo su contraseña. En la pantalla, esas acciones aparecen con un candado. La regla está en `src/domain/permissions.ts` y se aplica también en la base de datos y en la función `admin-users` (`supabase/migrations/20261201000300_security.sql`).

Consecuencia: el Oficial de seguridad, con su rol por defecto, solo crea usuarios Colaborador u Oficial. Para que cree usuarios de otros roles, su rol necesita también esos permisos.

## Intranet

Pantalla principal de la aplicación (dirección `/`), visible para todos. Los documentos se organizan según el **mapa de procesos** de la institución: la portada muestra cada macroproceso (gobernantes, productivos, de apoyo) con sus procesos, y cada proceso o subproceso tiene una carpeta por tipo de documento (Manual, Procedimiento, Registro...). El buscador de toda la intranet está en la cabecera. La dirección guarda el proceso y la carpeta abiertos, así que se pueden compartir enlaces directos.

Secciones del menú lateral: **Intranet** (el mapa de procesos con lo publicado, `/`), **Mis documentos** (`/mis-documentos`, con el permiso *Publicar documentos*), **Por aprobar** (`/por-aprobar`, con *Aprobar publicaciones*) y **Configuración** (`/configuracion`, con *Configurar la intranet*). Mis documentos y Por aprobar muestran cuántos documentos tienen. Quien puede publicar tiene el botón **Publicar documento** en el menú.

### Mapa de procesos y tipos de documento

Se mantienen desde **Configuración**, sin tocar el código: agregar, renombrar, ordenar y eliminar macroprocesos, procesos (dentro de un macroproceso) y subprocesos (dentro de un proceso), y los tipos de documento, que son las carpetas (por ejemplo, «Tomo 1» o «Planes»). No se elimina un elemento que tenga otros debajo o documentos, ni un tipo en uso. Los documentos van en un proceso o subproceso, nunca directamente en un macroproceso.

Los colores de cada banda salen de la marca de la institución (claro, oscuro y más claro, como el mapa impreso) y se repiten si hay más de tres macroprocesos. El mapa inicial (el de la Cooperativa) y los tipos los crean la migración y el modo de demostración (`src/backend/local/intranetSeed.ts`).

### Publicación

1. Quien tiene el permiso *Publicar documentos* (por defecto, Jefatura) sube el archivo (PDF, Word .docx o Excel, hasta 20 MB) con su proceso, tipo, código, versión y **clasificación**. Si publica desde una carpeta abierta, el proceso y el tipo ya vienen elegidos. Queda *por aprobar*.
2. Un usuario con *Aprobar publicaciones* lo lee y lo **aprueba** (se publica) u **observa** con un comentario; el dueño lo corrige y lo vuelve a enviar. Nadie aprueba un documento que subió él mismo.
3. Para actualizar un documento publicado, su dueño sube una **nueva versión**: al aprobarse, la anterior se retira sola. El dueño o un aprobador también pueden **retirar** un documento.

La clasificación decide qué puede hacer quien lo consulta:

| Clasificación | Quién lo lee | Descarga |
| --- | --- | --- |
| Público | Todos los usuarios | Sí |
| Uso interno | Todos los usuarios | No: solo en el visor |
| Restringido | Solo los roles que elige el dueño | No: solo en el visor |

El dueño y los aprobadores siempre lo leen y lo descargan. La regla está en un solo lugar, `src/domain/documents.ts`, y la migración `supabase/migrations/20261201000100_intranet.sql` la repite en las políticas RLS.

El visor muestra PDF, Word (.docx, con `mammoth`) y Excel/CSV (con SheetJS) sin descargarlos. En los documentos de solo lectura oculta la descarga y pone una marca de agua con el nombre del usuario y la fecha. Es una barrera de uso, no de seguridad: quien puede leer un archivo en pantalla técnicamente puede guardarlo o capturarlo. Lo que sí impide el acceso a quien no corresponde son las políticas de la base de datos y del almacenamiento.

Word se acepta solo en .docx: el formato .doc antiguo no se puede mostrar en el visor.

### Contraseñas

- Los usuarios se crean con una contraseña temporal, que se muestra una sola vez a quien los crea.
- Con una contraseña temporal no se puede usar la aplicación hasta cambiarla (primer ingreso y después de un restablecimiento). La base de datos lo hace cumplir: hasta cambiarla, el usuario solo lee su propio perfil y su rol.
- Cada usuario cambia su contraseña cuando quiera desde la cabecera (icono de llave).
- Reglas: mínimo 10 caracteres, con mayúsculas, minúsculas y números (`src/lib/validation.ts`).

### Verificación en dos pasos

- Además de la contraseña, se pide un código de 6 dígitos de una aplicación autenticadora (Google Authenticator, Microsoft Authenticator u otra), que cambia cada 30 segundos.
- La política se elige en **Seguridad > Políticas** (quien gestiona roles): *opcional*, *obligatoria para quien gestiona usuarios o roles* (por defecto en Supabase) u *obligatoria para todos*. En el modo de demostración empieza opcional, para probar sin teléfono.
- Quien la tiene obligatoria y no la configuró, la configura en su próximo ingreso (QR o clave para escribir a mano). Cualquiera puede activarla o desactivarla (si no es obligatoria) desde **Mi perfil**.
- **La base de datos la hace cumplir:** sin el código, una sesión no lee ni cambia ningún dato (función `aal_ok`), aunque se use la API directamente.
- Si alguien pierde el teléfono, quien gestiona usuarios la restablece desde **Seguridad > Usuarios** (icono de escudo). Conviene confirmar antes la identidad de la persona por otro medio.

### Auditoría

- **Seguridad > Auditoría** (permiso *Consultar la auditoría*: Administrador y Oficial de seguridad) muestra quién hizo qué y cuándo, con búsqueda, filtro por tipo y fechas, y exportación a CSV.
- Se registran: ingresos, salidas y cierres por tiempo; cambios de contraseña y de la verificación en dos pasos; creación y cambios de usuarios, restablecimientos y roles; envío, aprobación, observación, retiro y eliminación de documentos; **apertura en el visor y descarga** de documentos; cambios del mapa de procesos, los tipos y la política de seguridad.
- **Nadie la modifica ni la borra**: en Supabase la tabla `audit_log` solo admite agregar (por disparadores y funciones), sin permisos de edición ni de borrado. El nombre de quien actuó se guarda tal cual, aunque después cambie.
- Los cambios de datos los registra la base de datos (disparadores). La lectura y descarga de documentos y los ingresos los informa la aplicación (función `log_event`). Los intentos de ingreso fallidos están en el registro de Supabase (*Authentication > Logs*).
- En el modo de demostración se guardan las últimas 5000 entradas en el navegador.

### Caducidad de la sesión

- La sesión se cierra tras **15 minutos sin actividad** (teclado, clics, rueda o toques; mover el ratón no cuenta) y a las **10 horas** del ingreso aunque haya actividad.
- Un minuto antes aparece un aviso con cuenta regresiva: *Seguir conectado* (solo por inactividad) o *Salir ahora*. Al cerrarse, la pantalla de ingreso explica el motivo.
- La actividad se comparte entre pestañas, y se comprueba contra la hora real: si el equipo se suspende o el navegador se cierra más del tiempo permitido, la sesión se cierra al volver.
- **Se configura por institución** (clave `session` de la marca, compilada o en `brand.json`):

  | Opción | Por defecto | Rango |
  | --- | --- | --- |
  | `idleMinutes` | `15` | 1 a 480 minutos sin actividad |
  | `maxHours` | `10` | 1 a 24 horas desde el ingreso |
  | `warningSeconds` | `60` | 10 a 300 segundos de aviso |

- Esto se aplica en el navegador. Para que lo haga cumplir también el servidor (aunque alguien copie la sesión del navegador), configura lo mismo en Supabase: ver *Configurar Supabase*.

### Nuestra institución

- Sección del menú con la **misión, visión, valores y política de calidad**, con el estilo de la pieza gráfica de la institución (título, línea e ícono en recuadro).
- La edita quien tiene *Configurar la intranet* (botón **Editar** en la sección), sin tocar el código. Queda en la auditoría.
- La política de calidad puede enlazar su **documento oficial** de la intranet (por código): siempre se abre la versión publicada vigente.
- En la **pantalla de ingreso**, bajo el eslogan, se muestra por defecto **todo** (misión, visión, valores y política de calidad) en bloques compactos; al editar se puede elegir solo la misión, solo los valores o nada. Es información pública: se lee sin sesión. En móvil se muestra solo el logotipo y el eslogan.
- Si no tiene contenido, la sección no aparece en el menú (salvo para quien puede escribirlo).
- En Supabase: tabla `institution_profile` (`supabase/migrations/20261201000500_institution.sql`). Empieza vacía; se llena desde la intranet.

### Fotos y cumpleaños

- Cada usuario puede tener **foto de perfil** y **cumpleaños** (solo día y mes, sin año, para no exponer la edad).
- Los registra quien gestiona usuarios (**Seguridad > Usuarios**), y cada persona los suyos desde **Mi perfil** (pulsando su foto en la cabecera).
- La foto se recorta en cuadrado y se comprime a 512 px en el navegador antes de subirla (`src/lib/images.ts`).
- **Celebración:** la primera vez del día que alguien ingresa, si hay cumpleaños hoy o en los próximos 3 días, se abre una ventana con confeti. Muestra las fotos de quienes cumplen hoy, con un botón *Enviar saludo* (abre el correo con el saludo escrito), y debajo, en «Se acercan · prepara algo lindo», a quienes cumplen en los próximos días. A quien cumple años lo felicita. No vuelve a aparecer ese día en ese navegador.
- **Tarjeta del menú lateral:** reemplaza al eslogan, que sigue en la pantalla de ingreso. Muestra quién cumple hoy o los próximos cumpleaños, con sus fotos. Al pulsarla abre la celebración o la lista de los próximos 30 días.
- El 29 de febrero se celebra el 28 en los años no bisiestos.
- **Se configura por institución** (clave `birthdays` de la marca, compilada o en `brand.json`):

  | Opción | Por defecto | Qué hace |
  | --- | --- | --- |
  | `enabled` | `true` | `false` apaga los cumpleaños: sin tarjeta (vuelve el eslogan al menú), sin celebración y sin el campo en Usuarios y en Mi perfil. Las fotos de perfil se mantienen. |
  | `celebration` | `true` | `false`: la ventana no se abre sola; solo desde la tarjeta del menú. |
  | `soonDays` | `3` | Días de anticipación (0 a 7) con que se avisan los próximos cumpleaños. `0`: solo los de hoy. |

- En el modo de demostración hay compañeros ficticios con cumpleaños repartidos desde hoy y retratos ilustrados (no son fotos de personas reales).
- En Supabase, las columnas `profiles.birthday` y `profiles.photo_path`, el bucket privado `avatars` y las funciones `set_my_birthday` y `set_my_photo` están en `supabase/migrations/20261201000200_birthdays_photos.sql`.

## Adaptarla a otra institución

Toda la identidad visual es configurable: textos, logotipos, colores (de marca, neutros y de estado), tipografías, esquinas y los tonos del mapa de procesos. Ningún color ni tipografía está escrito en las pantallas: los estilos leen variables (`src/styles/tokens.css`) que se llenan con la marca activa. Solo son obligatorios los textos y los colores `primary`, `accent` y `onPrimary`; el resto tiene un valor por defecto, y los tonos claros y oscuros se derivan solos de los dos colores de marca.

Hay dos formas de definir la marca, y se pueden combinar:

**A. Compilada en el código** (una institución por archivo):

1. Copia `src/brand/institutions/demo.ts`, que muestra todas las opciones, y cambia los valores.
2. Regístrala en `src/brand/index.ts`.
3. Elígela con `VITE_BRAND=<nombre>` en `.env.local` y compila.

**B. En el servidor, sin recompilar** (la misma compilación sirve a varias instituciones):

1. Copia `src/brand/brand.example.json` como `brand.json` junto al `index.html` publicado (en desarrollo, en `public/brand.json`).
2. Deja solo lo que cambia: lo que no esté en el archivo se toma de la marca compilada.
3. Copia los logotipos a la carpeta que indiques (por ejemplo `public/brands/`).

`brand.json` se valida al cargar: se ignoran las claves desconocidas, los colores que no sean colores CSS válidos y las direcciones que no sean rutas del sitio (`/...`) o `https://`, con un aviso en la consola del navegador. También se avisa si un color de texto no contrasta lo suficiente con su fondo (menos de 4.5:1).

| Clave | Qué define |
| --- | --- |
| `appName`, `institution`, `shortName`, `slogan`, `motto` | Textos: nombre de la aplicación, de la institución (completo y corto), eslogan y lema. |
| `logo.onLight`, `logo.onDark`, `logo.favicon` | Logotipo para fondos claros (menú), para el color principal (pantalla de ingreso) e icono de la pestaña. Sin logotipo se dibuja un isotipo genérico. |
| `colors.primary`, `colors.accent`, `colors.onPrimary` | Colores de marca y el texto sobre el color principal. |
| `colors.text`, `textMuted`, `textSubtle` | Texto principal, secundario y tenue. |
| `colors.background`, `surface`, `border`, `borderField` | Fondo de la aplicación, de tarjetas y campos, y bordes. |
| `colors.series1`, `series2` | Colores de los gráficos. |
| `colors.danger`, `warning`, `success` (y sus `Soft`, `warningStrong`) | Colores de estado. Conviene no cambiarlos: rojo, ámbar y verde significan lo mismo en cualquier institución. |
| `typography.body`, `headings`, `stylesheetUrl` | Familia del texto, de los títulos y la hoja que las carga (por ejemplo, Google Fonts). |
| `shape.radius`, `shape.fieldRadius` | Radio de las esquinas de tarjetas y de campos y botones, en píxeles. |
| `session.idleMinutes`, `session.maxHours`, `session.warningSeconds` | Caducidad de la sesión. Ver *Caducidad de la sesión*. |
| `birthdays.enabled`, `birthdays.celebration`, `birthdays.soonDays` | Si la institución usa los cumpleaños, si la celebración se abre sola y con cuántos días de anticipación avisa. Ver *Fotos y cumpleaños*. |
| `processTones` | Lista de tonos `{ band, text, accent }` para las bandas de macroprocesos de la intranet. Se usan en orden y se repiten. Por defecto: claro, oscuro y más claro, derivados de la marca. |

### Cooperativa Ambato

`ambato.ts` sigue el Libro de Marca CA-GMKTC-AN-03 REV00: azul #004283, turquesa #40BEE0, tipografía Kanit y el slogan «La fuerza de nuestras raíces».

Los logotipos oficiales están en `public/brands/`: `ambato.png` (positivo, azul, en el menú) y `ambato-negativo.png` (negativo, blanco, en la pantalla de ingreso). Se usan sin cambios, salvo la línea y el descriptor «Ahorros – Inversiones – Créditos», que se recortaron a pedido de la institución (el manual prohíbe modificar el imagotipo). Como el logotipo ya lleva el nombre de la institución, junto a él solo se muestra el de la aplicación. El icono de la pestaña se genera con el color principal: el imagotipo vertical con texto no se distingue a 16 px. Si la cooperativa entrega versiones en SVG, basta reemplazar las rutas en `ambato.ts`.

## Backend

Las pantallas solo conocen la interfaz `Backend` (`src/backend/types.ts`). Hay dos implementaciones:

- `src/backend/local/`: demostración, en el navegador.
- `src/backend/supabase/`: producción.

**Migrar a otro backend** es escribir una tercera implementación de esa interfaz y registrarla en `src/backend/index.ts`. Ninguna pantalla importa Supabase.

### Configurar Supabase

1. Crea el proyecto y aplica el esquema y la función:

   ```bash
   supabase link --project-ref <ref>
   supabase db push   # crea las tablas, las políticas RLS y el bucket "documents"
   supabase functions deploy admin-users
   ```

2. Crea el primer administrador. En *Authentication > Users* agrega el usuario (con *Auto Confirm User*) y luego, en el editor SQL:

   ```sql
   insert into public.profiles (id, email, full_name, role_id)
   select u.id, u.email, 'Nombre Apellido', r.id
   from auth.users u, public.roles r
   where u.email = 'admin@institucion.ec' and r.name = 'Administrador';
   ```

   Los demás usuarios se crean desde la aplicación.

3. Copia `.env.example` como `.env.local` con `VITE_BACKEND=supabase`, la URL y la clave anónima.

4. **Seguridad del servidor** (en el panel de Supabase, *Authentication*):
   - *Sessions*: *Inactivity timeout* y *Time-box user sessions* con los mismos tiempos que `session` (requiere el plan Pro). Es lo que hace cumplir la caducidad aunque alguien copie la sesión del navegador.
   - *Policies / Password*: longitud mínima 10 y exigir mayúsculas, minúsculas y números, igual que la aplicación; y *Leaked password protection*.
   - *Attack protection*: activar el CAPTCHA (hCaptcha o Turnstile) en el ingreso.
   - *Multi-Factor*: dejar habilitado TOTP (viene habilitado). La política de quién debe usarlo se elige en la aplicación.

Los permisos se aplican en la base de datos con políticas RLS (`supabase/migrations/`), no solo en la interfaz. Crear usuarios y restablecer contraseñas pasa por la función `admin-users`, porque requiere la clave de servicio, que nunca llega al navegador.

## Organización del código

El código está en inglés y los comentarios explican en español qué hace cada parte. Los componentes llevan nombre en inglés; las páginas y formularios, en español.

```
src/
  brand/        Identidad de cada institución (y brand.example.json)
  domain/       Modelo: tipos, reglas de acceso a documentos, mapa de procesos
  backend/      Contrato del backend y sus implementaciones
  components/   Componentes reutilizables (ui/) y de la intranet (intranet/)
  forms/        Formularios: DocumentoForm, RevisionForm, ProcesoForm, UsuarioForm…
  pages/        Pantallas: IntranetPage, UsuariosPage, RolesPage, ingreso
  context/      Sesión y avisos
  lib/          Fechas, validación, archivos
  styles/       Estilos; todos leen las variables de tokens.css
supabase/
  migrations/   Esquema, políticas RLS y almacenamiento
  functions/    admin-users: gestión de usuarios
```
