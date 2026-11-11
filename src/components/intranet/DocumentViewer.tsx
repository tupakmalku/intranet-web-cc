import { useEffect, useMemo, useRef, useState } from 'react'
import { backend } from '../../backend/index.ts'
import { useSession } from '../../context/auth.ts'
import { CLASSIFICATIONS } from '../../domain/labels.ts'
import type { IntranetDocument } from '../../domain/types.ts'
import { formatDateTime } from '../../lib/dates.ts'
import { saveFile, viewerKindOf } from '../../lib/files.ts'
import { useQuery } from '../../lib/useQuery.ts'
import Button from '../ui/Button.tsx'
import Icon from '../ui/Icon.tsx'
import Modal from '../ui/Modal.tsx'

interface Props {
  document: IntranetDocument
  /** El usuario puede bajar el archivo original (ver documentAccess). */
  canDownload: boolean
  onClose: () => void
}

/** Filas que se muestran por hoja de cálculo: más harían lento el navegador. */
const MAX_ROWS = 2000

/**
 * Visor de documentos de la intranet. Muestra PDF, Word (.docx) y Excel sin
 * descargarlos, para que los documentos de uso interno y restringidos se
 * puedan leer. En esos, además, oculta la descarga y pone una marca de agua
 * con el nombre de quien lo consulta.
 *
 * Es una barrera de uso, no de seguridad: quien ve un archivo en pantalla
 * siempre puede capturarlo. Lo que impide el acceso son los permisos del backend.
 */
export default function DocumentViewer({ document, canDownload, onClose }: Props) {
  const file = useQuery(() => backend.documents.getFile(document, 'view'), [document.id, document.path])
  const kind = viewerKindOf(document.fileName)
  const readOnly = !canDownload

  return (
    <Modal
      title={document.title}
      description={`${document.code} · versión ${document.version} · ${document.fileName}`}
      size="viewer"
      onClose={onClose}
      footer={
        canDownload ? (
          <Button icon="download" onClick={() => file.data && saveFile(file.data, document.fileName)} disabled={!file.data}>
            Descargar
          </Button>
        ) : (
          <p className="viewer-readonly">
            <Icon name="lock" size={18} />
            {CLASSIFICATIONS[document.classification].name}: solo lectura en la intranet. No se puede descargar.
          </p>
        )
      }
    >
      {/* En solo lectura se quita el menú contextual (guardar imagen, imprimir...). */}
      <div className="viewer" onContextMenu={readOnly ? (e) => e.preventDefault() : undefined}>
        {file.error && <p className="notice notice-error">{file.error}</p>}
        {!file.data && !file.error && <p className="loading">Abriendo el documento…</p>}
        {file.data && kind === 'pdf' && <PdfView file={file.data} readOnly={readOnly} title={document.title} />}
        {file.data && kind === 'word' && <WordView file={file.data} title={document.title} />}
        {file.data && (kind === 'sheet' || kind === 'csv') && <SheetView file={file.data} csv={kind === 'csv'} />}
        {file.data && !kind && (
          <p className="notice notice-warning">Este tipo de archivo no se puede mostrar en la intranet.{canDownload && ' Descárgalo para abrirlo.'}</p>
        )}
        {readOnly && file.data && <Watermark text={CLASSIFICATIONS[document.classification].name} />}
      </div>
    </Modal>
  )
}

/**
 * PDF con el visor del navegador. En solo lectura se pide sin barra de
 * herramientas (sin botón de descargar ni imprimir). La dirección temporal del
 * archivo se crea al mostrarlo y se libera al cerrarlo.
 */
function PdfView({ file, readOnly, title }: { file: Blob; readOnly: boolean; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    frame.current!.src = readOnly ? `${url}#toolbar=0&navpanes=0` : url
    return () => URL.revokeObjectURL(url)
  }, [file, readOnly])
  return <iframe ref={frame} className="viewer-frame" title={title} />
}

/**
 * Word convertido a HTML. Se muestra en un marco aislado (sandbox sin
 * scripts): el contenido viene de un archivo subido y no debe poder ejecutar
 * nada ni tocar la aplicación.
 */
function WordView({ file, title }: { file: Blob; title: string }) {
  const html = useQuery(async () => {
    const mammoth = (await import('mammoth')).default
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
    return result.value
  }, [file])

  if (html.error) return <p className="notice notice-error">No se pudo leer el documento de Word. Puede estar dañado.</p>
  if (html.data === undefined) return <p className="loading">Preparando el documento…</p>
  return <iframe className="viewer-frame viewer-page" title={title} sandbox="" srcDoc={wordPage(html.data)} />
}

/**
 * Valor de una variable de diseño (src/styles/tokens.css), ya resuelto con la
 * marca activa. Sirve donde las variables CSS no llegan: el marco aislado del
 * Word y la imagen de la marca de agua.
 */
function themeValue(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  // Se descartan caracteres que podrían cerrar la etiqueta <style> o el atributo.
  return value && !/[<>"]/.test(value) ? value : fallback
}

const wordPage = (body: string) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  body { max-width: 800px; margin: 0 auto; padding: 40px 48px; font: 15px/1.55 system-ui, 'Segoe UI', sans-serif; color: ${themeValue('--ink', '#14263b')}; background: ${themeValue('--surface', '#ffffff')}; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; margin: 12px 0; }
  td, th { border: 1px solid ${themeValue('--border-field', '#c5d1e0')}; padding: 6px 10px; vertical-align: top; }
  h1, h2, h3 { line-height: 1.25; }
</style></head><body>${body || '<p>El documento no tiene texto.</p>'}</body></html>`

/** Excel o CSV como tabla, una pestaña por hoja. */
function SheetView({ file, csv }: { file: Blob; csv: boolean }) {
  const [active, setActive] = useState(0)
  const book = useQuery(async () => {
    const XLSX = await import('xlsx')
    // El CSV se lee como texto para respetar las tildes (UTF-8).
    const workbook = csv ? XLSX.read(await file.text(), { type: 'string' }) : XLSX.read(await file.arrayBuffer(), { type: 'array' })
    return workbook.SheetNames.map((name) => {
      const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name], { header: 1, raw: false, defval: '' })
      return { name, rows: rows.slice(0, MAX_ROWS), total: rows.length }
    })
  }, [file, csv])

  if (book.error) return <p className="notice notice-error">No se pudo leer la hoja de cálculo. Puede estar dañada.</p>
  if (!book.data) return <p className="loading">Preparando la hoja de cálculo…</p>

  const sheet = book.data[Math.min(active, book.data.length - 1)]
  const columns = Math.max(0, ...sheet.rows.map((r) => r.length))
  return (
    <div className="viewer-sheet">
      {book.data.length > 1 && (
        <div className="tabs" role="tablist" aria-label="Hojas">
          {book.data.map((s, i) => (
            <button key={s.name} type="button" role="tab" aria-selected={i === active} className={i === active ? 'active' : ''} onClick={() => setActive(i)}>
              {s.name}
            </button>
          ))}
        </div>
      )}
      {sheet.rows.length ? (
        <div className="viewer-table">
          <table className="table">
            <tbody>
              {sheet.rows.map((row, r) => (
                <tr key={r}>
                  <th scope="row">{r + 1}</th>
                  {Array.from({ length: columns }, (_, c) => (
                    <td key={c}>{row[c]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="help">Esta hoja está vacía.</p>
      )}
      {sheet.total > MAX_ROWS && (
        <p className="help">
          Se muestran las primeras {MAX_ROWS.toLocaleString('es-EC')} filas de {sheet.total.toLocaleString('es-EC')}.
        </p>
      )}
    </div>
  )
}

/**
 * Marca de agua sobre el documento: clasificación, nombre de quien lo
 * consulta y fecha. Desalienta las capturas y, si circulan, dice de dónde salieron.
 */
function Watermark({ text }: { text: string }) {
  const { user } = useSession()
  const background = useMemo(() => {
    const label = `${text} · ${user.fullName} · ${formatDateTime(new Date().toISOString())}`
    const escaped = label.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="220"><text x="220" y="110" text-anchor="middle" transform="rotate(-24 220 110)" font-family="system-ui, sans-serif" font-size="15" fill="${themeValue('--ink', '#14263b')}" fill-opacity="0.13">${escaped}</text></svg>`
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
  }, [text, user.fullName])
  return <div className="viewer-watermark" style={{ backgroundImage: background }} aria-hidden="true" />
}
