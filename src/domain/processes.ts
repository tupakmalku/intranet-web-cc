import type { IntranetDocument, ProcessNode } from './types.ts'

/* Utilidades del mapa de procesos de la intranet. */

/** Nivel de un elemento: 0 macroproceso, 1 proceso, 2 subproceso. */
export type ProcessLevel = 0 | 1 | 2

export const PROCESS_LEVELS: Record<ProcessLevel, { name: string; plural: string }> = {
  0: { name: 'Macroproceso', plural: 'Macroprocesos' },
  1: { name: 'Proceso', plural: 'Procesos' },
  2: { name: 'Subproceso', plural: 'Subprocesos' },
}

/** Los subprocesos son el último nivel: debajo de ellos no se crea nada. */
export const MAX_PROCESS_LEVEL: ProcessLevel = 2

const byPosition = (a: ProcessNode, b: ProcessNode) => a.position - b.position

/** Los hijos directos de un elemento (o los macroprocesos, con null), en orden. */
export function childrenOf(processes: ProcessNode[], parentId: string | null): ProcessNode[] {
  return processes.filter((p) => p.parentId === parentId).sort(byPosition)
}

export function levelOf(processes: ProcessNode[], id: string): ProcessLevel {
  let level = 0
  let current = processes.find((p) => p.id === id)
  while (current?.parentId && level < MAX_PROCESS_LEVEL) {
    level++
    current = processes.find((p) => p.id === current!.parentId)
  }
  return level as ProcessLevel
}

/** El elemento y todo lo que cuelga de él. */
export function withSubprocesses(processes: ProcessNode[], id: string): Set<string> {
  const ids = new Set([id])
  for (let added = true; added; ) {
    added = false
    for (const p of processes) {
      if (p.parentId && ids.has(p.parentId) && !ids.has(p.id)) {
        ids.add(p.id)
        added = true
      }
    }
  }
  return ids
}

/** "2.1 Gestión de captaciones". */
export const processLabel = (process: ProcessNode) => `${process.code} ${process.name}`.trim()

/** Del macroproceso al elemento: [macroproceso, proceso, subproceso]. */
export function processPath(processes: ProcessNode[], id: string): ProcessNode[] {
  const path: ProcessNode[] = []
  let current = processes.find((p) => p.id === id)
  while (current) {
    path.unshift(current)
    current = processes.find((p) => p.id === current!.parentId)
  }
  return path
}

/** Cuántos documentos hay en el elemento y en todo lo que cuelga de él. */
export function countIn(processes: ProcessNode[], documents: IntranetDocument[], id: string): number {
  const ids = withSubprocesses(processes, id)
  return documents.filter((d) => ids.has(d.processId)).length
}

/** Sangría de los subprocesos en la lista (espacio eme: los espacios normales se recortan). */
const INDENT = String.fromCodePoint(0x2003)

/**
 * Opciones para elegir el proceso de un documento: procesos y subprocesos,
 * agrupados por macroproceso. Los macroprocesos solo agrupan: no llevan documentos.
 */
export function processOptions(processes: ProcessNode[]): { value: string; text: string; group: string }[] {
  return childrenOf(processes, null).flatMap((macro) =>
    childrenOf(processes, macro.id).flatMap((process) => [
      { value: process.id, text: processLabel(process), group: processLabel(macro) },
      ...childrenOf(processes, process.id).map((sub) => ({ value: sub.id, text: INDENT + processLabel(sub), group: processLabel(macro) })),
    ]),
  )
}
