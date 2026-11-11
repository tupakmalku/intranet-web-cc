import type { DocumentType, IntranetDocument, ProcessNode } from '../../domain/types.ts'

/*
 * Datos de ejemplo de la intranet: el mapa de procesos de la Cooperativa, los
 * tipos de documento y algunos documentos. El mismo mapa y los mismos tipos
 * los crea la migración de Supabase como punto de partida; después se
 * mantienen desde la intranet (pestaña Configuración).
 */

/** [código, nombre, subprocesos]. */
type SeedProcess = [code: string, name: string, subprocesses?: [code: string, name: string][]]

const PROCESS_MAP: [code: string, name: string, processes: SeedProcess[]][] = [
  [
    '1',
    'Macroprocesos gobernantes',
    [
      ['1.1', 'Gestión de la planificación institucional'],
      ['1.2', 'Gestión de la organización'],
      [
        '1.3',
        'Gestión de innovación y desarrollo',
        [
          ['1.3.1', 'Gestión de calidad'],
          ['1.3.2', 'Administración de procesos'],
          ['1.3.3', 'Gestión de proyectos'],
        ],
      ],
    ],
  ],
  [
    '2',
    'Macroprocesos productivos y de negocios',
    [
      ['2.1', 'Gestión de captaciones'],
      [
        '2.2',
        'Gestión de créditos',
        [
          ['2.2.1', 'Gestión de créditos'],
          ['2.2.3', 'Gestión de cobranza'],
        ],
      ],
      ['2.3', 'Gestión de servicios electrónicos'],
      ['2.4', 'Gestión de educación financiera'],
      ['2.5', 'Gestión de operaciones'],
      ['2.6', 'Gestión de atención al cliente'],
    ],
  ],
  [
    '3',
    'Macroprocesos de apoyo',
    [
      ['3.1', 'Gestión de talento humano'],
      [
        '3.2',
        'Gestión financiera y administrativa',
        [
          ['3.2.1', 'Gestión contable'],
          ['3.2.2', 'Gestión de tesorería'],
          ['3.2.3', 'Gestión de proveeduría y adquisiciones'],
          ['3.2.4', 'Gestión de estructuras financieras'],
        ],
      ],
      ['3.3', 'Gestión de tecnología de la información'],
      ['3.4', 'Gestión de balance social'],
      ['3.5', 'Gestión de seguridad física'],
      ['3.6', 'Gestión de asesoría legal administrativa'],
      ['3.7', 'Gestión de marketing y comunicación'],
    ],
  ],
]

/** El id de cada elemento sale de su código: "2.2.1" → "proc-2-2-1". */
const processId = (code: string) => `proc-${code.replaceAll('.', '-')}`

export function seedProcesses(): ProcessNode[] {
  const nodes: ProcessNode[] = []
  PROCESS_MAP.forEach(([code, name, processes], position) => {
    nodes.push({ id: processId(code), parentId: null, code, name, position })
    processes.forEach(([pCode, pName, subprocesses = []], pPosition) => {
      nodes.push({ id: processId(pCode), parentId: processId(code), code: pCode, name: pName, position: pPosition })
      subprocesses.forEach(([sCode, sName], sPosition) => {
        nodes.push({ id: processId(sCode), parentId: processId(pCode), code: sCode, name: sName, position: sPosition })
      })
    })
  })
  return nodes
}

const TYPE_NAMES = ['Estatuto', 'Reglamento', 'Política', 'Plan', 'Manual', 'Procedimiento', 'Instructivo', 'Registro', 'Anexo']

const typeId = (name: string) => `type-${TYPE_NAMES.indexOf(name) + 1}`

export function seedDocumentTypes(): DocumentType[] {
  return TYPE_NAMES.map((name) => ({ id: typeId(name), name, position: TYPE_NAMES.indexOf(name) }))
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

/** Documentos de ejemplo. Sus archivos se generan al abrirlos (./sampleFiles.ts), con la ruta "sample-<código>". */
export function seedDocuments(ownerId: string, approverId: string): IntranetDocument[] {
  type Seed = [
    code: string,
    title: string,
    type: string,
    process: string,
    version: string,
    classification: IntranetDocument['classification'],
    publishedDaysAgo: number | null,
    description: string,
  ]
  const seeds: Seed[] = [
    ['EST-001', 'Estatuto social de la Cooperativa', 'Estatuto', '1.2', '4.0', 'public', 90, 'Estatuto aprobado por la Asamblea General de Representantes.'],
    ['PLA-001', 'Plan estratégico institucional 2026-2030', 'Plan', '1.1', '1.0', 'internal', 60, 'Objetivos, indicadores y metas del período.'],
    ['MAN-SI-001', 'Manual de políticas de seguridad de la información', 'Manual', '3.3', '3.0', 'internal', 38, 'Control de acceso, uso aceptable e incidentes. Lectura obligatoria.'],
    ['PRO-TH-004', 'Procedimiento de vacaciones y permisos', 'Procedimiento', '3.1', '2.1', 'public', 19, 'Cómo solicitar vacaciones y justificar permisos.'],
    ['REG-CR-001', 'Reglamento de crédito', 'Reglamento', '2.2.1', '5.2', 'internal', 30, 'Condiciones, montos, plazos y garantías de los productos de crédito.'],
    ['INS-CA-003', 'Instructivo de depósitos a plazo fijo', 'Instructivo', '2.1', '1.1', 'public', 15, 'Pasos para abrir, renovar y cancelar un depósito a plazo fijo.'],
    ['ANX-OP-002', 'Anexo: matriz de riesgos operativos', 'Anexo', '2.5', '1.2', 'restricted', 10, 'Riesgos por proceso con su nivel, control y responsable.'],
    ['PRO-CA-010', 'Procedimiento de apertura de cuentas de ahorro', 'Procedimiento', '2.1', '1.0', 'internal', null, 'Pasos y controles para abrir una cuenta de ahorro.'],
  ]
  return seeds.map(([code, title, type, process, version, classification, publishedDaysAgo, description]) => {
    const csv = code === 'ANX-OP-002'
    const published = publishedDaysAgo !== null
    return {
      id: `doc-${code.toLowerCase()}`,
      code,
      title,
      typeId: typeId(type),
      processId: processId(process),
      version,
      description,
      classification,
      // La matriz de riesgos la leen el jefe normativo y las jefaturas.
      allowedRoleIds: classification === 'restricted' ? ['role-regulatory', 'role-manager'] : [],
      status: published ? 'published' : 'pending',
      reviewNote: '',
      ownerId,
      reviewedBy: published ? approverId : null,
      submittedAt: daysAgo((publishedDaysAgo ?? 1) + 2),
      publishedAt: published ? daysAgo(publishedDaysAgo) : null,
      replacesId: null,
      fileName: `${code} ${title.replace(/[:]/g, '')} v${version}.${csv ? 'csv' : 'pdf'}`,
      mimeType: csv ? 'text/csv' : 'application/pdf',
      size: csv ? 720 : 1400,
      path: `sample-${code.toLowerCase()}`,
    }
  })
}
