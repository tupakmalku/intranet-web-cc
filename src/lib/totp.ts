/*
 * Códigos de un solo uso por tiempo (TOTP, RFC 6238), los de Google
 * Authenticator, Microsoft Authenticator y similares: 6 dígitos que cambian
 * cada 30 segundos. Lo usa el backend local; Supabase los verifica en su servidor.
 */

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STEP_SECONDS = 30
const DIGITS = 6

/** Clave nueva al azar (160 bits), en base32 como la escriben las aplicaciones. */
export function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  let bits = ''
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0')
  let secret = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) secret += BASE32[parseInt(bits.slice(i, i + 5), 2)]
  return secret
}

function decodeBase32(secret: string): Uint8Array<ArrayBuffer> {
  let bits = ''
  for (const char of secret.replace(/[\s=]/g, '').toUpperCase()) {
    const value = BASE32.indexOf(char)
    if (value < 0) throw new Error('Clave base32 inválida.')
    bits += value.toString(2).padStart(5, '0')
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  return bytes
}

/** El código de la ventana de tiempo `counter`. */
async function codeAt(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', decodeBase32(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const message = new ArrayBuffer(8)
  new DataView(message).setBigUint64(0, BigInt(counter))
  const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, message))
  const offset = hash[hash.length - 1] & 0x0f
  const binary = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3]
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

/** El código actual (sirve para pruebas). */
export const currentCode = (secret: string, now = Date.now()) => codeAt(secret, Math.floor(now / 1000 / STEP_SECONDS))

/** ¿Es válido el código? Acepta la ventana anterior y la siguiente, por desfase de relojes. */
export async function verifyCode(secret: string, code: string, now = Date.now()): Promise<boolean> {
  const clean = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(clean)) return false
  const counter = Math.floor(now / 1000 / STEP_SECONDS)
  for (const delta of [0, -1, 1]) if ((await codeAt(secret, counter + delta)) === clean) return true
  return false
}

/** Dirección otpauth:// que se codifica en el QR para que la aplicación agregue la cuenta. */
export function otpauthUri(secret: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`
}
