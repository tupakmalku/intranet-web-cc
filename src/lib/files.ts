/* Reglas de los archivos de los documentos de la intranet (PDF, Word y Excel). */

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

/** Reglas de un tipo de archivo, para el selector (FileDrop) y la validación. */
export interface FileRules {
  /** Valor del atributo `accept` del selector de archivos. */
  accept: string
  hint: string
  /** Tipo del archivo según su extensión. Vacío si no se acepta. */
  mimeTypeOf: (file: File) => string
  /** Por qué no se acepta un archivo, o null si es válido. */
  problem: (file: File) => string | null
}

export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024

/**
 * Documentos de la intranet. Word solo en .docx y no .doc: el formato antiguo
 * no se puede mostrar en el visor, y los documentos de uso interno o
 * restringidos solo se leen ahí.
 */
const DOCUMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
}

const documentMimeTypeOf = (file: File) => DOCUMENT_TYPES[extensionOf(file.name)] ?? ''

export const DOCUMENT_FILES: FileRules = {
  accept: Object.keys(DOCUMENT_TYPES)
    .map((extension) => `.${extension}`)
    .join(','),
  hint: 'PDF, Word (DOCX) o Excel (XLSX, XLS, CSV). Máximo 20 MB.',
  mimeTypeOf: documentMimeTypeOf,
  problem(file) {
    if (extensionOf(file.name) === 'doc') return 'Guarda el Word como .docx: el formato .doc antiguo no se puede leer en la intranet.'
    if (!documentMimeTypeOf(file)) return 'Ese tipo de archivo no se acepta. Sube un PDF, un Word o un Excel.'
    if (file.size === 0) return 'El archivo está vacío.'
    if (file.size > MAX_DOCUMENT_SIZE) return 'El archivo pesa más de 20 MB.'
    return null
  },
}

/** Cómo se muestra un archivo en el visor, según su extensión. */
export function viewerKindOf(fileName: string): 'pdf' | 'word' | 'sheet' | 'csv' | null {
  const extension = extensionOf(fileName)
  if (extension === 'pdf') return 'pdf'
  if (extension === 'docx') return 'word'
  if (extension === 'xlsx' || extension === 'xls') return 'sheet'
  if (extension === 'csv') return 'csv'
  return null
}

/** Hace que el navegador guarde el archivo con su nombre original. */
export function saveFile(file: Blob, fileName: string): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Se libera después: algunos navegadores aún leen la dirección tras el clic.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** 1536 → "1,5 KB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toLocaleString('es-EC', { maximumFractionDigits: 1 })} ${units[unit]}`
}

/** Nombre seguro para guardar el archivo: sin tildes, espacios ni símbolos. */
export function safeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(-120)
}
