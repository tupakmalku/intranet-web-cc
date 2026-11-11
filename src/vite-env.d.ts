/// <reference types="vite/client" />

/** Variables de configuración. Se definen en el archivo .env (ver .env.example). */
interface ImportMetaEnv {
  /** Institución cuya identidad se aplica: una de las registradas en src/brand/index.ts. */
  readonly VITE_BRAND?: string
  /** "supabase" o "local" (por defecto). */
  readonly VITE_BACKEND?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
