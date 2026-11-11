import Select from './ui/Select.tsx'
import { daysInMonth, MONTHS, parseBirthday, toBirthday } from '../lib/birthdays.ts'

interface Props {
  id: string
  /** MM-DD, o null si no hay. */
  value: string | null
  onChange: (value: string | null) => void
  help?: string
}

/** Cumpleaños: mes y día, sin año. Elegir «Sin registrar» en el mes lo quita. */
export default function BirthdayField({ id, value, onChange, help }: Props) {
  const { month, day } = value ? parseBirthday(value) : { month: 0, day: 0 }

  function change(nextMonth: number, nextDay: number) {
    // Si el día no existe en el mes nuevo (31 de abril), se ajusta al último.
    onChange(nextMonth ? toBirthday(nextMonth, Math.min(nextDay, daysInMonth(nextMonth))) : null)
  }

  return (
    <div className="field-pair">
      <Select
        id={`${id}-month`}
        label="Cumpleaños: mes"
        icon="cake"
        emptyLabel="Sin registrar"
        options={MONTHS.map((name, i) => ({ value: String(i + 1), text: name[0].toUpperCase() + name.slice(1) }))}
        value={month ? String(month) : ''}
        onChange={(e) => change(Number(e.target.value), day || 1)}
        help={help}
      />
      <Select
        id={`${id}-day`}
        label="Día"
        options={Array.from({ length: month ? daysInMonth(month) : 31 }, (_, i) => ({ value: String(i + 1), text: String(i + 1) }))}
        value={String(day || 1)}
        onChange={(e) => change(month, Number(e.target.value))}
        disabled={!month}
      />
    </div>
  )
}
