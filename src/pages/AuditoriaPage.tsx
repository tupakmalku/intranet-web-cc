import { useState } from 'react'
import { backend } from '../backend/index.ts'
import Button from '../components/ui/Button.tsx'
import EmptyState from '../components/ui/EmptyState.tsx'
import Field from '../components/ui/Field.tsx'
import Select from '../components/ui/Select.tsx'
import { AUDIT_ACTIONS, AUDIT_GROUPS, type AuditGroup } from '../domain/audit.ts'
import { toCsv } from '../lib/csv.ts'
import { formatDateTime, toIsoDate } from '../lib/dates.ts'
import { saveFile } from '../lib/files.ts'
import { useQuery } from '../lib/useQuery.ts'

/** Cuántas entradas se piden cada vez. */
const PAGE = 200

/** Registro de auditoría: quién hizo qué y cuándo, con filtros y exportación. Solo lectura. */
export default function AuditoriaPage() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<AuditGroup | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const filter = { query: query.trim() || undefined, group: group || undefined, from: from || undefined, to: to || undefined, limit }
  const entries = useQuery(() => backend.audit.list(filter), [query, group, from, to, limit])

  function exportCsv() {
    const rows = (entries.data ?? []).map((e) => [formatDateTime(e.at), e.actorName, AUDIT_ACTIONS[e.action]?.name ?? e.action, e.targetName, e.detail])
    saveFile(toCsv([['Fecha', 'Usuario', 'Acción', 'Sobre', 'Detalle'], ...rows]), `auditoria-${toIsoDate(new Date())}.csv`)
  }

  return (
    <>
      <div className="audit-filters">
        <Field id="audit-query" label="Buscar" icon="search" placeholder="Usuario, documento, detalle…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select
          id="audit-group"
          label="Tipo"
          emptyLabel="Todo"
          options={(Object.keys(AUDIT_GROUPS) as AuditGroup[]).map((g) => ({ value: g, text: AUDIT_GROUPS[g] }))}
          value={group}
          onChange={(e) => setGroup(e.target.value as AuditGroup | '')}
        />
        <Field id="audit-from" label="Desde" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        <Field id="audit-to" label="Hasta" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        <Button variant="secondary" icon="download" onClick={exportCsv} disabled={!entries.data?.length}>
          Exportar CSV
        </Button>
      </div>

      {entries.error && <p className="notice notice-error">{entries.error}</p>}
      {entries.data && !entries.data.length && <EmptyState title="Sin registros">No hay entradas que coincidan con los filtros.</EmptyState>}
      {!!entries.data?.length && (
        <div className="card table-container">
          <table className="table audit-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {entries.data.map((e) => (
                <tr key={e.id}>
                  <td className="nowrap">{formatDateTime(e.at)}</td>
                  <td>{e.actorName}</td>
                  <td>
                    {AUDIT_ACTIONS[e.action]?.name ?? e.action}
                    {e.targetName && <strong> {e.targetName}</strong>}
                  </td>
                  <td>
                    <small>{e.detail}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {entries.data?.length === limit && (
        <div className="toolbar toolbar-end audit-more">
          <Button variant="text" onClick={() => setLimit(limit + PAGE)}>
            Mostrar más
          </Button>
        </div>
      )}
    </>
  )
}
