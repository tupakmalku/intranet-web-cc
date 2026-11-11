import { processTone } from '../../brand/index.ts'
import { childrenOf, countIn } from '../../domain/processes.ts'
import type { IntranetDocument, ProcessNode } from '../../domain/types.ts'
import Icon from '../ui/Icon.tsx'
import type { IntranetCatalog } from './catalog.ts'

interface Props {
  catalog: IntranetCatalog
  /** Los documentos publicados que el usuario puede ver: de ellos salen los conteos. */
  documents: IntranetDocument[]
  /** Abre un proceso o subproceso, y opcionalmente una de sus carpetas (tipo). */
  onOpen: (processId: string, typeId?: string) => void
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Portada de la intranet: el mapa de procesos de la institución. Cada
 * macroproceso es una banda (con el tono de su grupo según la marca, como en
 * el mapa impreso) y debajo van sus procesos como tarjetas, con las carpetas que
 * tienen documentos y los subprocesos. Todo sale del catálogo, así que si el
 * mapa cambia, esta pantalla cambia sola.
 */
export default function ProcessMap({ catalog, documents, onOpen }: Props) {
  const macros = childrenOf(catalog.processes, null)
  if (!macros.length) {
    return <p className="help">Todavía no hay un mapa de procesos. Quien configura la intranet lo arma en la pestaña Configuración.</p>
  }

  return (
    <div className="process-map">
      {macros.map((macro, i) => {
        const processes = childrenOf(catalog.processes, macro.id)
        const total = countIn(catalog.processes, documents, macro.id)
        return (
          <section key={macro.id} className="macro" style={processTone(i)} aria-labelledby={`macro-${macro.id}`}>
            <header className="macro-band">
              <h2 id={`macro-${macro.id}`}>
                {macro.code && <span className="macro-code">{macro.code}</span>}
                {macro.name}
              </h2>
              <span className="macro-count">
                {plural(processes.length, 'proceso', 'procesos')} · {plural(total, 'documento', 'documentos')}
              </span>
            </header>
            {processes.length ? (
              <div className="process-grid">
                {processes.map((process) => (
                  <ProcessCard key={process.id} process={process} catalog={catalog} documents={documents} onOpen={onOpen} />
                ))}
              </div>
            ) : (
              <p className="help">Este macroproceso todavía no tiene procesos.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

function ProcessCard({ process, catalog, documents, onOpen }: { process: ProcessNode } & Props) {
  const own = documents.filter((d) => d.processId === process.id)
  const folders = catalog.types.map((type) => ({ type, count: own.filter((d) => d.typeId === type.id).length })).filter((f) => f.count)
  const subprocesses = childrenOf(catalog.processes, process.id)
  const total = countIn(catalog.processes, documents, process.id)

  return (
    <article className={`process-card ${total ? '' : 'is-empty'}`}>
      <button type="button" className="process-card-title" onClick={() => onOpen(process.id)}>
        <span className="process-code">{process.code}</span>
        <strong>{process.name}</strong>
        <small>{total ? plural(total, 'documento', 'documentos') : 'Sin documentos publicados'}</small>
      </button>
      {(folders.length > 0 || subprocesses.length > 0) && (
        <ul className="folders">
          {folders.map(({ type, count }) => (
            <li key={type.id}>
              <button type="button" onClick={() => onOpen(process.id, type.id)}>
                <Icon name="folder" size={18} />
                <span>{type.name}</span>
                <span className="folder-count">{count}</span>
              </button>
            </li>
          ))}
          {subprocesses.map((sub) => (
            <li key={sub.id}>
              <button type="button" className="is-subprocess" onClick={() => onOpen(sub.id)}>
                <Icon name="layers" size={18} />
                <span>
                  {sub.code} {sub.name}
                </span>
                <span className="folder-count">{countIn(catalog.processes, documents, sub.id)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
