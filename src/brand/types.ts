/*
 * Identidad de una institución: todo lo que cambia de una a otra sin tocar el
 * resto del código. Solo son obligatorios los textos y los tres colores de
 * marca; lo demás tiene un valor por defecto (ver src/styles/tokens.css) que
 * se reemplaza indicándolo aquí.
 *
 * Los colores aceptan cualquier color CSS: "#004283", "rgb(0 66 131)",
 * "hsl(210 100% 26%)". Los tonos claros y oscuros de la interfaz se derivan
 * solos de `primary` y `accent`.
 */

export interface BrandColors {
  /** Color principal: menú, botones, encabezados. */
  primary: string
  /** Color de acento: detalles, selección, gráficos. */
  accent: string
  /** Texto sobre el color principal. Debe contrastar con él (4.5:1 o más). */
  onPrimary: string

  /** Series de los gráficos. Por defecto, el principal y el de acento. */
  series1?: string
  series2?: string

  /* Neutros. */
  /** Texto principal. */
  text?: string
  /** Texto secundario: ayudas, etiquetas de tabla. */
  textMuted?: string
  /** Texto tenue: marcadores de posición, elementos inactivos. */
  textSubtle?: string
  /** Fondo de la aplicación. */
  background?: string
  /** Fondo de tarjetas, modales y campos. */
  surface?: string
  /** Bordes de tarjetas y separadores. */
  border?: string
  /** Bordes de los campos de formulario. */
  borderField?: string

  /* Estados. Se recomienda no cambiarlos: el rojo, el ámbar y el verde significan lo mismo en cualquier institución. */
  danger?: string
  dangerSoft?: string
  warning?: string
  warningStrong?: string
  warningSoft?: string
  success?: string
  successSoft?: string
}

/**
 * Tono de un grupo de macroprocesos en el mapa de procesos de la intranet
 * (gobernantes, productivos, de apoyo). Se usan en orden y se repiten si hay
 * más macroprocesos que tonos.
 */
export interface ProcessTone {
  /** Fondo de la banda del macroproceso. */
  band: string
  /** Texto sobre la banda. */
  text: string
  /** Color de detalle de sus procesos: borde de las tarjetas, numeración, iconos. Por defecto, el de la banda. */
  accent?: string
}

export interface Brand {
  /** Nombre de la aplicación, como aparece en la pestaña del navegador y en el menú. */
  appName: string
  /** Nombre completo de la institución. */
  institution: string
  /** Nombre corto, para espacios reducidos. */
  shortName: string
  /** Eslogan de la institución. */
  slogan: string
  /** Lema de la aplicación: una línea que explica para qué sirve. */
  motto: string

  /**
   * Logotipos (rutas en /public o direcciones https). Sin ellos se dibuja un
   * isotipo genérico. Si solo hay una versión, se usa en ambos fondos.
   */
  logo?: {
    /** Para fondos claros: el menú lateral. */
    onLight?: string
    /** Para fondos del color principal: el panel de ingreso. */
    onDark?: string
    /** Icono de la pestaña del navegador. Por defecto se genera con el color principal. */
    favicon?: string
  }

  colors: BrandColors

  typography?: {
    /** Familia del texto general. */
    body?: string
    /** Familia de títulos y encabezados. Por defecto, la del texto. */
    headings?: string
    /** Hoja de estilos que carga las familias (por ejemplo, de Google Fonts). */
    stylesheetUrl?: string
  }

  shape?: {
    /** Radio de las esquinas de tarjetas y modales, en píxeles. */
    radius?: number
    /** Radio de las esquinas de campos y botones, en píxeles. */
    fieldRadius?: number
  }

  /** Tonos del mapa de procesos. Por defecto: claro (acento), oscuro (principal) y más claro (principal suave). */
  processTones?: ProcessTone[]

  /** Cumpleaños. Por defecto, todo activo con 3 días de anticipación. */
  birthdays?: BirthdaySettings

  /** Caducidad de la sesión. Por defecto: 15 minutos de inactividad y 10 horas como máximo. */
  session?: SessionSettings
}

/**
 * Cuánto dura una sesión. Se aplica en el navegador; para que también lo haga
 * cumplir el servidor, configurar lo mismo en Supabase (ver README, Seguridad).
 */
export interface SessionSettings {
  /** Minutos sin actividad (1 a 480) tras los que se cierra la sesión. */
  idleMinutes?: number
  /** Horas desde el ingreso (1 a 24) tras las que se cierra aunque haya actividad. */
  maxHours?: number
  /** Segundos de aviso antes del cierre (10 a 300), con la opción de seguir conectado. */
  warningSeconds?: number
}

/** Qué partes de los cumpleaños usa la institución. Las fotos de perfil no dependen de esto. */
export interface BirthdaySettings {
  /**
   * false apaga los cumpleaños por completo: sin tarjeta en el menú (vuelve el
   * eslogan), sin celebración y sin el campo en Usuarios y en Mi perfil.
   */
  enabled?: boolean
  /** Abrir sola la ventana de celebración una vez al día. Con false, solo se abre desde la tarjeta del menú. */
  celebration?: boolean
  /** Días de anticipación (0 a 7) con que se avisan los próximos cumpleaños. 0: solo los de hoy. */
  soonDays?: number
}
