/** Arma un CSV (con BOM, para que Excel respete las tildes) a partir de filas de texto. */
export function toCsv(rows: string[][]): Blob {
  const escape = (cell: string) => (/[",\n;]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)
  const text = rows.map((row) => row.map(escape).join(',')).join('\r\n')
  return new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' })
}
