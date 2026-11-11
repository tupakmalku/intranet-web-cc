# CLAUDE.md

Este archivo orienta a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Qué es

Intranet documental (React 19 + TypeScript + Vite, react-router v7) donde las áreas publican manuales, procedimientos y políticas ordenados según el **mapa de procesos** de la institución, con un flujo de aprobación y una clasificación por documento. Nació dentro de Compliance 365 (por eso `src/App.tsx` redirige la antigua dirección `/intranet` a `/`). El README es la especificación del producto: léelo antes de cambiar el comportamiento.

## Comandos

```bash
npm install
npm run dev       # Servidor de Vite; sin .env.local arranca en modo de demostración (backend local)
npm run build     # tsc -b && vite build: es la comprobación de tipos
npm run lint      # eslint .
npm run preview
```

No hay pruebas automatizadas. Los cambios se comprueban con `npm run build`, `npm run lint` y en la aplicación en marcha.

Usuarios de demostración: `admin`, `oficial`, `jefatura`, `aprobador` y `colaborador` `@demo.ec`, con la contraseña `Temporal.2026` (se obliga a cambiarla en el primer ingreso). Los datos de demostración están en la clave `intranet.local.v1` de `localStorage` y los archivos en IndexedDB; para empezar de cero, borra los datos del sitio en el navegador.

Supabase: `supabase db push` (esquema, políticas RLS y bucket `documents`) y `supabase functions deploy admin-users`.

## Configuración (`.env.local`, ver `.env.example`)

- `VITE_BACKEND`: `local` (por defecto, demostración en el navegador) o `supabase`.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: solo con `supabase`.
- `VITE_BRAND`: marca compilada de la institución (por defecto `ambato`).

## Arquitectura

**Backend intercambiable.** La interfaz solo conoce el contrato `Backend` de `src/backend/types.ts` (auth, users, roles, processes, documentTypes, documents). `src/backend/index.ts` elige la implementación según `VITE_BACKEND`. Ninguna página ni componente importa Supabase. Hay dos implementaciones:
- `src/backend/local/`: demostración; aplica las mismas reglas que las políticas RLS de Supabase. Los datos iniciales están en `seed.ts` e `intranetSeed.ts`.
- `src/backend/supabase/`: producción. Crear usuarios y restablecer contraseñas pasa por la función `supabase/functions/admin-users`, porque necesita la clave de servicio.

Todo cambio en el contrato `Backend` se implementa en **las dos** versiones.

**Las reglas de acceso están en un solo lugar y se repiten en SQL.** `src/domain/documents.ts` (`documentAccess`, `canReviewDocument`, etc.) es la fuente única que usan las pantallas y el backend local; `supabase/migrations/20261201000100_intranet.sql` la repite en las políticas RLS y de almacenamiento. Si cambia una, cambia la otra. Reglas clave: el dueño y los aprobadores siempre leen y descargan; los demás solo ven lo publicado, según la clasificación (público = descarga, uso interno = solo visor, restringido = solo visor y solo para los roles elegidos); nadie aprueba su propio documento; al aprobar una versión nueva se retira la anterior.

**Permisos y roles.** Los roles son combinaciones de `Permission` editables por los usuarios (definidos en `src/domain/types.ts`, textos en `src/domain/labels.ts`). `src/App.tsx` habilita las rutas según los permisos y obliga a cambiar la contraseña temporal cuando `session.user.mustChangePassword`.

**Mapa de procesos.** Jerarquía macroproceso → proceso → subproceso (`src/domain/processes.ts`, `MAX_PROCESS_LEVEL`); los documentos van en procesos o subprocesos, nunca en un macroproceso. Los tipos de documento son las «carpetas» de cada proceso. Ambos se editan desde Configuración, sin tocar el código. La dirección guarda el proceso y la carpeta abiertos, para compartir enlaces.

**Marca.** Nada propio de una institución se escribe en componentes ni en CSS. `src/brand/index.ts` une la marca compilada (`src/brand/institutions/*.ts`, elegida con `VITE_BRAND`) con un `brand.json` opcional en el servidor (validado en `src/brand/runtime.ts`) y escribe las variables CSS `--brand-*`. `src/styles/tokens.css` las traduce a variables de la aplicación con valores de respaldo; los demás estilos solo leen las variables de `tokens.css`: nunca colores ni tipografías escritos a mano. Los colores de las bandas del mapa salen de `processTone()`.

**Lectura de datos.** Los componentes usan `src/lib/useQuery.ts` (lee al montar y al cambiar las dependencias; `reload()` vuelve a leer) y `src/lib/useSubmit.ts`. Los backends lanzan `BackendError`, cuyo mensaje está en español y se muestra tal cual al usuario.

**Visor de documentos.** `DocumentViewer` muestra PDF, .docx (mammoth) y Excel/CSV (SheetJS, instalado desde el tarball del CDN de SheetJS) en el navegador, con marca de agua en los documentos de solo lectura. De Word solo se acepta `.docx`. Los tipos y el tamaño máximo de archivo están en `src/lib/files.ts`.

## Pantalla objetivo

La mayoría de los usuarios usa portátiles de 14" a 1920×1080, normalmente con escalado de Windows del 125–150 % (unos 1536×730 o 1280×600 px CSS útiles). Diseña y comprueba primero a ese tamaño: el alto es escaso, así que evita filas que solo contengan un botón y espacios verticales grandes. El móvil es secundario.

**Menú y cabecera.** Las vistas de la intranet (mapa, mis documentos, por aprobar, configuración) son rutas propias (`src/pages/intranetViews.ts`) que renderizan `IntranetPage` con la prop `view`, y aparecen como secciones del menú lateral en `AppLayout`, que también cuenta los documentos de cada una y tiene el botón de publicar (abre el formulario con `?publicar=1`). Las direcciones antiguas `/?vista=…` redirigen a su ruta. `AppLayout` deja un espacio en la cabecera (`topbarSlot`); una sección lo llena con `createPortal` y entonces el título queda solo para lectores de pantalla. Solo la vista del mapa (Intranet) pone ahí su buscador; las demás muestran su título. Ambas cosas se comparten con `useLayout()` (`src/context/layout.ts`); tras cambiar un documento, la intranet llama a `refreshCounts()`.

**Fotos y cumpleaños.** `User.birthday` es `MM-DD` o null (sin año); los cálculos están en `src/lib/birthdays.ts`. `User.photo` es una clave opaca: la imagen se obtiene con `backend.users.photoUrl` (URL firmada en Supabase, IndexedDB o retrato ilustrado `demo:<n>:<peinado>` en local) y se muestra con `Avatar`. Quien gestiona usuarios edita ambos de cualquiera (`users.update`, `users.setPhoto`); cada usuario los suyos (`auth.setMyBirthday`, `users.setPhoto` sobre sí mismo; en Supabase, funciones `set_my_birthday` y `set_my_photo`). `AppLayout` carga los compañeros y abre `BirthdayCelebration` una vez al día (marca en `localStorage`), muestra `BirthdayCard` al pie del menú y abre `PerfilForm` desde el avatar de la cabecera. Tras editar usuarios se llama a `refreshBirthdays()` de `useLayout()`. Cada institución puede apagarlos o ajustarlos con `brand.birthdays` (`enabled`, `celebration`, `soonDays`); se leen con `birthdaySettings()` de `src/brand/index.ts`, y toda pantalla nueva de cumpleaños debe respetarlo.

**Seguridad.** *Nadie otorga lo que no tiene*: `src/domain/permissions.ts` (`canGrantRole`, `canManageUser`) es la regla para asignar roles y gestionar usuarios; la repiten el backend local, la función `admin-users` y la migración `20261201000300_security.sql` (`can_grant_role` y disparadores). Con contraseña temporal pendiente la base de datos no deja leer nada salvo el propio perfil y rol (`is_active_user`), y el backend local igual (`requireSession` frente a `requireSessionAllowingTemporary`). Doble factor (TOTP): la política (`MfaPolicy`) se guarda en el servidor (`app_settings`; local: `db.settings`) y la base de datos la hace cumplir con `aal_ok()` dentro de `is_active_user`/`has_permission`; `Session.mfa` dice si está configurado, exigido y verificado, y `App.tsx` muestra `VerificacionPage` hasta verificar. Piezas reutilizables: `MfaSetup`, `MfaStatus`, `CodeField`, `RadioList`; TOTP local en `src/lib/totp.ts`. Auditoría: acciones y textos en `src/domain/audit.ts`; en Supabase la registran disparadores y `log_event` (lecturas, ingresos), en local la función `audit()` del backend; toda acción nueva que cambie datos debe quedar registrada en ambos. La caducidad de sesión la aplica `SessionGuard` (montado en `App.tsx`) con el hook reutilizable `useIdleTimer` y `SessionExpiryDialog`; los tiempos son `brand.session`, leídos con `sessionSettings()`. `Session.startedAt` es la hora del ingreso.

## Convenciones

- Identificadores en inglés; comentarios y todo texto visible para el usuario en **español**. Los componentes llevan nombre en inglés; las páginas y formularios, en español (`IntranetPage`, `UsuariosPage`, `DocumentoForm`, `RevisionForm`).
- Las importaciones llevan la extensión `.ts`/`.tsx` (`allowImportingTsExtensions`, `verbatimModuleSyntax`: usa `import type` para los tipos). Con `erasableSyntaxOnly` no se permiten enums, namespaces ni propiedades de parámetro.
- Reglas de contraseña (mínimo 10 caracteres, con mayúsculas, minúsculas y números) en `src/lib/validation.ts`.
