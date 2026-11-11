import type { CSSProperties } from 'react'
import ambato from './institutions/ambato.ts'
import demo from './institutions/demo.ts'
import { loadBrandOverride, type BrandOverride } from './runtime.ts'
import type { BirthdaySettings, Brand, BrandColors, ProcessTone } from './types.ts'

/**
 * Instituciones compiladas. Para agregar una: se crea su archivo en
 * ./institutions, se registra aquí y se elige con la variable VITE_BRAND.
 * Para cambiar la marca sin recompilar, ver ./runtime.ts (brand.json).
 */
const BRANDS: Record<string, Brand> = { ambato, demo }

const DEFAULT_BRAND = 'ambato'

/**
 * La institución activa. Empieza con la compilada (VITE_BRAND) y `initBrand`
 * le aplica brand.json, si existe, antes de dibujar la aplicación.
 */
export const brand: Brand = structuredClone(BRANDS[import.meta.env.VITE_BRAND ?? DEFAULT_BRAND] ?? BRANDS[DEFAULT_BRAND])

/** Variable CSS (leída por src/styles/tokens.css) de cada color de la marca. */
const COLOR_VARIABLES: Record<keyof BrandColors, string> = {
  primary: '--brand-primary',
  accent: '--brand-accent',
  onPrimary: '--brand-on-primary',
  series1: '--brand-series-1',
  series2: '--brand-series-2',
  text: '--brand-ink',
  textMuted: '--brand-ink-2',
  textSubtle: '--brand-ink-3',
  background: '--brand-background',
  surface: '--brand-surface',
  border: '--brand-border',
  borderField: '--brand-border-field',
  danger: '--brand-red',
  dangerSoft: '--brand-red-050',
  warning: '--brand-amber',
  warningStrong: '--brand-amber-strong',
  warningSoft: '--brand-amber-050',
  success: '--brand-green',
  successSoft: '--brand-green-050',
}

/** Une la corrección de brand.json con la marca compilada, grupo por grupo. */
function merge(base: Brand, override: BrandOverride): Brand {
  return {
    ...base,
    ...override,
    colors: { ...base.colors, ...override.colors },
    logo: { ...base.logo, ...override.logo },
    typography: { ...base.typography, ...override.typography },
    shape: { ...base.shape, ...override.shape },
    birthdays: { ...base.birthdays, ...override.birthdays },
  }
}

/** Configuración de cumpleaños de la institución activa, con los valores por defecto aplicados. */
export function birthdaySettings(): Required<BirthdaySettings> {
  return {
    enabled: brand.birthdays?.enabled ?? true,
    celebration: brand.birthdays?.celebration ?? true,
    soonDays: Math.min(7, Math.max(0, Math.round(brand.birthdays?.soonDays ?? 3))),
  }
}

/** Icono de la pestaña: el isotipo genérico con los colores de la institución. */
function generatedFavicon(b: Brand): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="${b.colors.primary}"/><path d="M12 5l6 2.200v4.300c0 3.300-2.400 5.900-6 6.700-3.600-.800-6-3.400-6-6.700V7.200zM9.300 12l2 2 3.600-3.800" fill="none" stroke="${b.colors.onPrimary}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** Familia CSS con comillas: 'Kanit'. */
const fontFamily = (name: string) => `'${name.replace(/'/g, '')}'`

/**
 * Aplica la identidad al documento: pasa colores, tipografía y forma a las
 * variables --brand-* que lee tokens.css, y pone el título y el icono.
 */
export function applyBrand(b: Brand = brand): void {
  const style = document.documentElement.style
  for (const [key, variable] of Object.entries(COLOR_VARIABLES) as [keyof BrandColors, string][]) {
    const value = b.colors[key]
    if (value) style.setProperty(variable, value)
    else style.removeProperty(variable)
  }
  if (b.typography?.body) style.setProperty('--brand-font', fontFamily(b.typography.body))
  if (b.typography?.headings) style.setProperty('--brand-font-headings', fontFamily(b.typography.headings))
  if (b.shape?.radius !== undefined) style.setProperty('--brand-radius', `${b.shape.radius}px`)
  if (b.shape?.fieldRadius !== undefined) style.setProperty('--brand-radius-field', `${b.shape.fieldRadius}px`)

  if (b.typography?.stylesheetUrl) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = b.typography.stylesheetUrl
    document.head.append(link)
  }

  document.title = `${b.appName} · ${b.shortName}`
  // index.html trae un icono vacío para que el navegador no pida /favicon.ico mientras carga la marca.
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.head.appendChild(document.createElement('link'))
  icon.rel = 'icon'
  icon.href = b.logo?.favicon ?? generatedFavicon(b)
}

/**
 * Carga brand.json (si lo hay), lo une a la marca compilada y la aplica. Se
 * llama una vez, antes de dibujar la aplicación.
 */
export async function initBrand(): Promise<void> {
  const override = await loadBrandOverride()
  if (override) Object.assign(brand, merge(brand, override))
  applyBrand(brand)
  warnLowContrast(brand)
}

/* ---------- Mapa de procesos ---------- */

/** Tonos por defecto, derivados de los colores de marca: claro, oscuro y más claro, como un mapa de procesos impreso. */
const DEFAULT_TONES: ProcessTone[] = [
  { band: 'color-mix(in srgb, var(--accent) 42%, var(--surface))', text: 'var(--ink)', accent: 'var(--accent-strong)' },
  { band: 'var(--primary)', text: 'var(--on-primary)', accent: 'var(--primary)' },
  {
    band: 'color-mix(in srgb, var(--primary) 16%, var(--surface))',
    text: 'var(--ink)',
    accent: 'color-mix(in srgb, var(--primary) 75%, var(--accent))',
  },
]

/** Variables CSS del tono del macroproceso número `index` (se repiten en ciclo). */
export function processTone(index: number): CSSProperties {
  const tones = brand.processTones?.length ? brand.processTones : DEFAULT_TONES
  const tone = tones[index % tones.length]
  const accent = tone.accent ?? tone.band
  return {
    '--tone': accent,
    '--tone-band': tone.band,
    '--tone-on': tone.text,
    '--tone-soft': `color-mix(in srgb, ${accent} 10%, var(--surface))`,
  } as CSSProperties
}

/* ---------- Contraste ---------- */

/** Luminancia relativa de un color #rgb o #rrggbb (WCAG). Null para otros formatos. */
function luminance(color: string): number | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1]
  if (!hex) return null
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razón de contraste entre dos colores hexadecimales, o null si no se puede calcular. */
export function contrastRatio(a: string, b: string): number | null {
  const [la, lb] = [luminance(a), luminance(b)]
  if (la === null || lb === null) return null
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Avisa en la consola si una combinación de la marca no se lee bien (menos de 4.5:1). */
function warnLowContrast(b: Brand): void {
  const pairs: [string, string | undefined, string | undefined][] = [
    ['onPrimary sobre primary', b.colors.onPrimary, b.colors.primary],
    ['text sobre surface', b.colors.text, b.colors.surface],
    ['text sobre background', b.colors.text, b.colors.background],
  ]
  for (const [name, fg, bg] of pairs) {
    const ratio = fg && bg ? contrastRatio(fg, bg) : null
    if (ratio !== null && ratio < 4.5) console.warn(`Marca: poco contraste en ${name} (${ratio.toFixed(1)}:1; se recomienda 4.5:1 o más).`)
  }
}

export type { Brand }
