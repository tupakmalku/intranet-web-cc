import { processPath } from '../../domain/processes.ts'
import type { DocumentType, ProcessNode, Role } from '../../domain/types.ts'

/** Lo que las piezas de la intranet necesitan para mostrar un documento: el mapa, los tipos, los roles y los nombres. */
export interface IntranetCatalog {
  processes: ProcessNode[]
  types: DocumentType[]
  roles: Role[]
  /** Nombre de cada usuario, por id. */
  names: Map<string, string>
}

export const typeNameOf = (catalog: IntranetCatalog, typeId: string) => catalog.types.find((t) => t.id === typeId)?.name ?? 'Sin tipo'

/** "2.2 Gestión de créditos › 2.2.1 Gestión de créditos", sin el macroproceso. */
export function processNameOf(catalog: IntranetCatalog, processId: string): string {
  const path = processPath(catalog.processes, processId).slice(1)
  return path.length ? path.map((p) => `${p.code} ${p.name}`.trim()).join(' › ') : 'Sin proceso'
}
