/* Reglas de validación compartidas por los formularios y los backends. */

export const PASSWORD_MIN_LENGTH = 10

export const PASSWORD_HINT = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con mayúsculas, minúsculas y números.`

/** Devuelve qué le falta a una contraseña, o null si es válida. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`
  if (!/[a-z]/.test(password)) return 'Incluye al menos una letra minúscula.'
  if (!/[A-Z]/.test(password)) return 'Incluye al menos una letra mayúscula.'
  if (!/\d/.test(password)) return 'Incluye al menos un número.'
  return null
}

export function isEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
}

/** Sin letras ni números que se confunden (0/O, 1/l/I), para dictarla o copiarla sin errores. */
const TEMPORARY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

/** Genera una contraseña temporal aleatoria que cumple las reglas de `passwordProblem`. */
export function generateTemporaryPassword(length = 12): string {
  for (;;) {
    const random = crypto.getRandomValues(new Uint32Array(length))
    const password = Array.from(random, (n) => TEMPORARY_ALPHABET[n % TEMPORARY_ALPHABET.length]).join('')
    if (!passwordProblem(password)) return password
  }
}
