/* Fotos de perfil: se recortan y comprimen en el navegador antes de subirlas. */

/** Tipos de imagen que se aceptan al elegir una foto. */
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'

/** Tamaño máximo del archivo original (antes de comprimirlo). */
export const MAX_PHOTO_SOURCE = 10 * 1024 * 1024

/** Lado de la foto guardada, en píxeles: alcanza para la celebración de cumpleaños y pesa poco. */
const SIDE = 512

/**
 * Recorta el centro de la imagen en un cuadrado, lo reduce a 512 px y lo
 * guarda como JPEG. Falla con un mensaje en español si no es una imagen válida.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!PHOTO_ACCEPT.split(',').includes(file.type)) throw new Error('Elige una imagen JPG, PNG o WebP.')
  if (file.size > MAX_PHOTO_SOURCE) throw new Error('La imagen pesa más de 10 MB.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('No se pudo leer la imagen. Prueba con otra.')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.min(SIDE, side)
  const context = canvas.getContext('2d')!
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo preparar la imagen.'))), 'image/jpeg', 0.85),
  )
}
