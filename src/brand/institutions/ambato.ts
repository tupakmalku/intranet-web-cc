import type { Brand } from '../types.ts'

/**
 * Cooperativa de Ahorro y Crédito Ambato (https://cooperativaambato.fin.ec/).
 *
 * Valores tomados del Libro de Marca CA-GMKTC-AN-03 REV00 (17/12/2024):
 * - Cromática corporativa (5.4): Azul #004283 y Turquesa #40BEE0, abstraídos
 *   del poncho de la comunidad Chibuleo.
 * - Tipografía corporativa (07): familia Kanit. Light para texto, Regular
 *   para títulos y Medium para el logotipo.
 * - Slogan (5.3): "La fuerza de nuestras raíces".
 *
 * El manual prohíbe modificar el imagotipo (06, uso incorrecto): se usan los
 * archivos oficiales en /public/brands/ (positivo, azul, para fondos claros;
 * negativo, blanco, para el color principal), solo sin la línea ni el
 * descriptor «Ahorros – Inversiones – Créditos», recortados a pedido de la institución. Como es vertical y lleva
 * texto, no sirve de favicon a 16 px: el de la pestaña se genera con el color principal.
 */
const ambato: Brand = {
  appName: 'Intranet',
  institution: 'Cooperativa de Ahorro y Crédito Ambato',
  shortName: 'Cooperativa Ambato',
  slogan: 'La fuerza de nuestras raíces',
  // Como en su pieza gráfica: «LA FUERZA» en un recuadro y «De nuestras raíces» en letra manuscrita.
  sloganDisplay: { highlight: 'La fuerza', script: 'De nuestras raíces' },
  motto: 'Manuales, procedimientos y políticas de la institución en un solo lugar.',
  logo: { onLight: '/brands/ambato.png', onDark: '/brands/ambato-negativo.png' },
  colors: {
    // Azul: calma, estabilidad y confianza.
    primary: '#004283',
    // Turquesa: transparencia y armonía. El manual indica HEXA #40BEE0 (sus valores RGB dicen 0/203/236); manda el HEXA.
    accent: '#40BEE0',
    onPrimary: '#ffffff',
  },
  typography: {
    body: 'Kanit',
    headings: 'Kanit',
    // La manuscrita más parecida a la del eslogan publicado; se reemplaza si la institución entrega la suya.
    script: 'Kaushan Script',
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,300;0,400;0,500;0,600;0,700;1,800&family=Kaushan+Script&display=swap',
  },
}

export default ambato
