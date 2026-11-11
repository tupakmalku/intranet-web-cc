/*
 * Retratos ilustrados para los usuarios ficticios del modo de demostración:
 * figuras simples en SVG (no son fotos de personas reales), para ver cómo se
 * lucen las fotos en la intranet sin subir ninguna.
 */

const BACKGROUNDS = [
  ['#ffd6a5', '#ffadad'],
  ['#caffbf', '#9bf6ff'],
  ['#bdb2ff', '#ffc6ff'],
  ['#a0c4ff', '#9bf6ff'],
  ['#fdffb6', '#ffd6a5'],
  ['#ffc6ff', '#ffadad'],
]
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']
const HAIR = ['#2c1b10', '#4a2c16', '#141414', '#7a4a21', '#b5651d']
const SHIRT = ['#1f4e79', '#3aa6c9', '#6d597a', '#2a9d8f', '#e76f51', '#264653']

/** Peinados: 0 corto, 1 largo, 2 recogido. */
function hair(style: number, color: string): string {
  if (style === 1)
    return `<path d="M58 96c0-30 18-48 42-48s42 18 42 48v62c-8 4-16 6-22 6V104c-10 6-30 6-40 0v60c-6 0-14-2-22-6z" fill="${color}"/>`
  if (style === 2) return `<circle cx="100" cy="46" r="18" fill="${color}"/><path d="M62 98c0-28 17-44 38-44s38 16 38 44c-10-12-24-18-38-18s-28 6-38 18z" fill="${color}"/>`
  return `<path d="M62 100c0-30 17-46 38-46s38 16 38 46c-6-14-20-22-38-22s-32 8-38 22z" fill="${color}"/>`
}

/** Retrato número `n` con el peinado `style`, como dirección data: para un <img>. */
export function demoPhoto(n: number, style: number): string {
  const [from, to] = BACKGROUNDS[n % BACKGROUNDS.length]
  const skin = SKIN[n % SKIN.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="200" height="200" fill="url(#g)"/>
<path d="M30 200c4-40 34-60 70-60s66 20 70 60z" fill="${SHIRT[n % SHIRT.length]}"/>
<rect x="88" y="118" width="24" height="28" rx="10" fill="${skin}"/>
<ellipse cx="100" cy="98" rx="34" ry="40" fill="${skin}"/>
${hair(style, HAIR[n % HAIR.length])}
<circle cx="88" cy="100" r="3.5" fill="#2b2b2b"/><circle cx="112" cy="100" r="3.5" fill="#2b2b2b"/>
<path d="M90 116c6 6 14 6 20 0" fill="none" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round"/>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
