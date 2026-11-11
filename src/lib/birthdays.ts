/*
 * Cumpleaños. Se guardan como texto MM-DD, sin año: basta para saludar y no
 * expone la edad de nadie.
 */

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Días de cada mes; febrero admite el 29. */
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export const daysInMonth = (month: number) => DAYS_IN_MONTH[month - 1]

/** ¿Es un MM-DD válido? */
export function isBirthday(value: string): boolean {
  const match = /^(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [month, day] = [Number(match[1]), Number(match[2])]
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(month)
}

export const toBirthday = (month: number, day: number) => `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export function parseBirthday(value: string): { month: number; day: number } {
  const [month, day] = value.split('-').map(Number)
  return { month, day }
}

/** "11-14" → "14 de noviembre". */
export function formatBirthday(value: string): string {
  const { month, day } = parseBirthday(value)
  return `${day} de ${MONTHS[month - 1]}`
}

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

/** La fecha en que se celebra en ese año. El 29 de febrero, en años no bisiestos, se celebra el 28. */
function celebration(value: string, year: number): Date {
  const { month, day } = parseBirthday(value)
  return new Date(year, month - 1, month === 2 && day === 29 && !isLeapYear(year) ? 28 : day)
}

/** Días que faltan para el próximo cumpleaños: 0 si es hoy. */
export function daysUntil(value: string, today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let next = celebration(value, start.getFullYear())
  if (next < start) next = celebration(value, start.getFullYear() + 1)
  return Math.round((next.getTime() - start.getTime()) / 86_400_000)
}

/** "hoy", "mañana", "en 5 días". */
export function whenText(days: number): string {
  if (days === 0) return 'hoy'
  if (days === 1) return 'mañana'
  return `en ${days} días`
}

/** Las personas con cumpleaños en los próximos `withinDays` días (0 = solo hoy), de la más cercana a la más lejana. */
export function upcomingBirthdays<T extends { fullName: string; birthday: string | null }>(
  people: T[],
  today: Date,
  withinDays: number,
): (T & { birthday: string; days: number })[] {
  return people
    .filter((p): p is T & { birthday: string } => !!p.birthday && isBirthday(p.birthday))
    .map((p) => ({ ...p, days: daysUntil(p.birthday, today) }))
    .filter((p) => p.days <= withinDays)
    .sort((a, b) => a.days - b.days || a.fullName.localeCompare(b.fullName, 'es'))
}

/** "Ana Pérez", "Ana Pérez y Luis Mora" o "Ana Pérez, Luis Mora y 2 más". */
export function namesText(names: string[]): string {
  if (names.length <= 2) return names.join(' y ')
  return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
}

export const firstName = (fullName: string) => fullName.split(/\s+/)[0]

/** Enlace para escribir un saludo de cumpleaños por correo. */
export function greetingMailto(person: { email: string; fullName: string }, from: string): string {
  const subject = `¡Feliz cumpleaños, ${firstName(person.fullName)}!`
  const body = `Hola, ${firstName(person.fullName)}:\n\nTe deseo un muy feliz cumpleaños. ¡Que tengas un gran día!\n\nUn abrazo,\n${from}`
  return `mailto:${person.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
