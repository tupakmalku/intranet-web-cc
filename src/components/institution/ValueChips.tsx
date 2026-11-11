import Icon from '../ui/Icon.tsx'

/** Valores institucionales como etiquetas. `tone="dark"`: sobre el color principal (pantalla de ingreso). */
export default function ValueChips({ values, tone = 'light' }: { values: string[]; tone?: 'light' | 'dark' }) {
  return (
    <ul className={`value-chips value-chips-${tone}`}>
      {values.map((value) => (
        <li key={value}>
          <Icon name="check" size={14} />
          {value}
        </li>
      ))}
    </ul>
  )
}
