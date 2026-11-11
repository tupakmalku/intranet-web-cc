/*
 * Archivos de los documentos de ejemplo del backend local. Los datos de ejemplo
 * se arman sin acceso a archivos, así que estos se generan al abrirlos por
 * primera vez: un PDF de una página con texto y un CSV.
 */

/** Escapa el texto para una cadena de PDF. */
const pdfText = (text: string) => text.replace(/[\\()]/g, (c) => `\\${c}`)

/**
 * Un PDF mínimo de una página, con el título y los párrafos en Helvetica.
 * Usa WinAnsiEncoding, que incluye las letras con tilde y la eñe: cada carácter
 * ocupa un byte, así que las posiciones del índice (xref) son las del texto.
 */
function samplePdf(title: string, paragraphs: string[]): Blob {
  const lines = [`BT /F1 18 Tf 72 740 Td (${pdfText(title)}) Tj ET`]
  let y = 704
  for (const paragraph of paragraphs) {
    lines.push(`BT /F2 11 Tf 72 ${y} Td (${pdfText(paragraph)}) Tj ET`)
    y -= 22
  }
  const content = lines.join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = objects.map((body, i) => {
    const offset = pdf.length
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
    return offset
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  // Latin-1: un byte por carácter.
  const bytes = Uint8Array.from(pdf, (c) => c.charCodeAt(0) & 0xff)
  return new Blob([bytes], { type: 'application/pdf' })
}

const RISK_MATRIX = [
  '\uFEFFProceso,Riesgo,Probabilidad,Impacto,Nivel,Control,Responsable',
  'Captaciones,Apertura de cuenta con identidad falsa,Media,Alto,Alto,Verificación biométrica,Jefatura de Captaciones',
  'Crédito,Concentración en un sector económico,Alta,Alto,Crítico,Límites por sector,Jefatura de Crédito',
  'Tecnología,Caída del sistema transaccional,Baja,Alto,Medio,Sitio alterno y respaldos diarios,Jefatura de Tecnología',
  'Tesorería,Error en la conciliación bancaria,Media,Medio,Medio,Doble revisión diaria,Jefatura Financiera',
  'Talento Humano,Rotación de personal clave,Media,Medio,Medio,Plan de sucesión,Jefatura de Talento Humano',
].join('\n')

/** Parte un texto en líneas que caben en el ancho de la página. */
function wrap(text: string, width = 88): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  return line ? [...lines, line] : lines
}

/** El archivo de un documento de ejemplo (ruta "sample-..."), o null si no es uno. */
export function sampleFile(document: { path: string; code: string; title: string; version: string; description: string; mimeType: string }): Blob | null {
  if (!document.path.startsWith('sample-')) return null
  if (document.mimeType === 'text/csv') return new Blob([RISK_MATRIX], { type: 'text/csv' })
  return samplePdf(document.title, [
    `Código: ${document.code}   Versión: ${document.version}`,
    '',
    ...wrap(document.description),
    '',
    '1. Objetivo: establecer los lineamientos que rigen este proceso en la institución.',
    '2. Alcance: aplica a todas las áreas y colaboradores que intervienen en el proceso.',
    '3. Responsables: la jefatura del área dueña mantiene y actualiza este documento.',
    '',
    'Documento de ejemplo generado por el modo de demostración.',
  ])
}
