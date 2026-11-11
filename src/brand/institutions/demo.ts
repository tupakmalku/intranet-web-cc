import type { Brand } from '../types.ts'

/**
 * Institución de ejemplo y plantilla para una nueva. Muestra todas las opciones;
 * solo son obligatorios los textos y `primary`, `accent` y `onPrimary`. Lo que
 * se omite toma el valor por defecto de src/styles/tokens.css.
 *
 * Para usarla: copiar este archivo, cambiar los valores, registrarlo en
 * src/brand/index.ts y elegirlo con VITE_BRAND. O, sin recompilar, poner los
 * mismos valores en un brand.json junto a la aplicación publicada.
 */
const demo: Brand = {
  appName: 'Intranet',
  institution: 'Institución Financiera de Ejemplo',
  shortName: 'Institución Demo',
  slogan: 'Tu confianza, nuestro compromiso',
  motto: 'Manuales, procedimientos y políticas de la institución en un solo lugar.',
  // logo: { onLight: '/brands/demo.svg', onDark: '/brands/demo-blanco.svg', favicon: '/brands/demo-icono.png' },
  colors: {
    primary: '#1f4e79',
    accent: '#3aa6c9',
    onPrimary: '#ffffff',
    // Opcionales (estos son los valores por defecto):
    // text: '#14263b',
    // textMuted: '#51627a',
    // textSubtle: '#7d8ca1',
    // background: '#f3f6fa',
    // surface: '#ffffff',
    // border: '#dce4ee',
    // borderField: '#c5d1e0',
    // series1: '#1f4e79',
    // series2: '#3aa6c9',
  },
  // typography: { body: 'Inter', headings: 'Inter', stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap' },
  // shape: { radius: 14, fieldRadius: 12 },
  // processTones: [
  //   { band: '#cfe6f3', text: '#14263b', accent: '#2b7fa6' },
  //   { band: '#1f4e79', text: '#ffffff' },
  //   { band: '#e6eef6', text: '#14263b', accent: '#1f4e79' },
  // ],
}

export default demo
