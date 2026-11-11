import type { Brand, BrandColors, ProcessTone } from './types.ts'

/*
 * Configuración de la marca en el servidor, sin recompilar: si junto a la
 * aplicación publicada hay un archivo brand.json, sus valores reemplazan a los
 * de la institución elegida con VITE_BRAND. Así se adapta la misma compilación
 * a otra institución copiando ese archivo y sus logotipos.
 *
 * El archivo viene de fuera del código, así que se valida: solo se aceptan las
 * claves conocidas, colores CSS válidos y direcciones relativas o https. Lo
 * demás se descarta con un aviso en la consola.
 */

/** Lo que puede traer brand.json: cualquier parte de la marca. */
export type BrandOverride = Partial<Omit<Brand, 'colors' | 'logo' | 'typography' | 'shape' | 'birthdays' | 'session'>> & {
  colors?: Partial<BrandColors>
  logo?: Brand['logo']
  typography?: Brand['typography']
  shape?: Brand['shape']
  birthdays?: Brand['birthdays']
  session?: Brand['session']
}

const TEXT_KEYS = ['appName', 'institution', 'shortName', 'slogan', 'motto'] as const
const COLOR_KEYS: (keyof BrandColors)[] = [
  'primary',
  'accent',
  'onPrimary',
  'series1',
  'series2',
  'text',
  'textMuted',
  'textSubtle',
  'background',
  'surface',
  'border',
  'borderField',
  'danger',
  'dangerSoft',
  'warning',
  'warningStrong',
  'warningSoft',
  'success',
  'successSoft',
]

const warn = (message: string) => console.warn(`brand.json: ${message}`)

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const isColor = (value: unknown): value is string => typeof value === 'string' && CSS.supports('color', value)

/** Ruta del mismo sitio ("/brands/logo.svg") o dirección https. */
const isSafeUrl = (value: unknown): value is string =>
  typeof value === 'string' && (/^\/(?!\/)/.test(value) || /^https:\/\/[^\s"'<>]+$/.test(value))

/** Nombre de familia tipográfica: letras, números, espacios y guiones. */
const isFontName = (value: unknown): value is string => typeof value === 'string' && /^[\p{L}\p{N} _-]{1,60}$/u.test(value)

function pick<T>(source: Record<string, unknown>, key: string, valid: (v: unknown) => v is T, what: string): T | undefined {
  if (!(key in source)) return undefined
  if (valid(source[key])) return source[key]
  warn(`se ignoró "${key}": ${what}.`)
  return undefined
}

/** Quita las claves sin valor, para no pisar los valores de la marca base. */
function compact<T extends object>(value: T): T | undefined {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined)
  return entries.length ? (Object.fromEntries(entries) as T) : undefined
}

/** Convierte el contenido de brand.json en una corrección de la marca, descartando lo inválido. */
export function sanitizeBrandOverride(raw: unknown): BrandOverride {
  if (!isRecord(raw)) {
    warn('debe ser un objeto JSON.')
    return {}
  }
  const override: BrandOverride = {}
  for (const key of TEXT_KEYS) {
    const value = pick(raw, key, (v): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 200, 'debe ser un texto')
    if (value !== undefined) override[key] = value.trim()
  }

  if (isRecord(raw.colors)) {
    const colors: Partial<BrandColors> = {}
    for (const key of COLOR_KEYS) colors[key] = pick(raw.colors, key, isColor, 'no es un color CSS válido')
    override.colors = compact(colors)
  }

  if (isRecord(raw.logo)) {
    override.logo = compact({
      onLight: pick(raw.logo, 'onLight', isSafeUrl, 'debe ser una ruta "/..." o una dirección https'),
      onDark: pick(raw.logo, 'onDark', isSafeUrl, 'debe ser una ruta "/..." o una dirección https'),
      favicon: pick(raw.logo, 'favicon', isSafeUrl, 'debe ser una ruta "/..." o una dirección https'),
    })
  }

  if (isRecord(raw.typography)) {
    override.typography = compact({
      body: pick(raw.typography, 'body', isFontName, 'no es un nombre de familia válido'),
      headings: pick(raw.typography, 'headings', isFontName, 'no es un nombre de familia válido'),
      stylesheetUrl: pick(raw.typography, 'stylesheetUrl', isSafeUrl, 'debe ser una ruta "/..." o una dirección https'),
    })
  }

  if (isRecord(raw.shape)) {
    const isRadius = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 40
    override.shape = compact({
      radius: pick(raw.shape, 'radius', isRadius, 'debe ser un número de 0 a 40'),
      fieldRadius: pick(raw.shape, 'fieldRadius', isRadius, 'debe ser un número de 0 a 40'),
    })
  }

  if ('processTones' in raw) {
    const tones = Array.isArray(raw.processTones)
      ? raw.processTones.filter((t): t is ProcessTone => isRecord(t) && isColor(t.band) && isColor(t.text) && (t.accent === undefined || isColor(t.accent)))
      : []
    if (tones.length) override.processTones = tones.map(({ band, text, accent }) => ({ band, text, accent }))
    else warn('se ignoró "processTones": debe ser una lista de { band, text, accent? } con colores válidos.')
  }

  if (isRecord(raw.birthdays)) {
    const isFlag = (v: unknown): v is boolean => typeof v === 'boolean'
    override.birthdays = compact({
      enabled: pick(raw.birthdays, 'enabled', isFlag, 'debe ser true o false'),
      celebration: pick(raw.birthdays, 'celebration', isFlag, 'debe ser true o false'),
      soonDays: pick(raw.birthdays, 'soonDays', (v): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 7, 'debe ser un número entero de 0 a 7'),
    })
  }

  if (isRecord(raw.session)) {
    const between = (min: number, max: number) => (v: unknown): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max
    override.session = compact({
      idleMinutes: pick(raw.session, 'idleMinutes', between(1, 480), 'debe ser un número entero de 1 a 480'),
      maxHours: pick(raw.session, 'maxHours', between(1, 24), 'debe ser un número entero de 1 a 24'),
      warningSeconds: pick(raw.session, 'warningSeconds', between(10, 300), 'debe ser un número entero de 10 a 300'),
    })
  }

  const known = new Set<string>([...TEXT_KEYS, 'colors', 'logo', 'typography', 'shape', 'processTones', 'birthdays', 'session', '$schema', '_comment'])
  for (const key of Object.keys(raw)) if (!known.has(key)) warn(`clave desconocida "${key}".`)
  return override
}

/**
 * Lee brand.json junto a la aplicación. Devuelve null si no hay (el caso
 * normal cuando la marca va compilada) o si no es JSON.
 */
export async function loadBrandOverride(): Promise<BrandOverride | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}brand.json`, { cache: 'no-cache' })
    // Sin el archivo, el servidor de una SPA suele responder index.html: eso no es una marca.
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null
    return sanitizeBrandOverride(await response.json())
  } catch {
    warn('no se pudo leer; se usa la marca compilada.')
    return null
  }
}
