/* Fechas. Las fechas sin hora se manejan como texto AAAA-MM-DD, que se compara y ordena sin conversiones. */

const pad = (n: number) => String(n).padStart(2, '0')

/** Saludo según la hora: "Buenos días", "Buenas tardes" o "Buenas noches". */
export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** La fecha larga, sin año: "miércoles, 11 de noviembre". */
export function longDate(date = new Date()): string {
  return date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** La fecha local en formato AAAA-MM-DD. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "2026-10-13" → "13 oct 2026". */
export function formatDate(iso: string | null): string {
  if (!iso) return 'Sin fecha'
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Fecha y hora de un instante ISO, en la zona del usuario. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
