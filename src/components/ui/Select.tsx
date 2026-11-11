import type { SelectHTMLAttributes } from 'react'
import Icon, { type IconName } from './Icon.tsx'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string
  label: string
  icon?: IconName
  /** Con `group`, las opciones se agrupan bajo ese título (las del mismo grupo deben ir seguidas). */
  options: { value: string; text: string; group?: string }[]
  /** Texto de la opción vacía inicial. Sin él, no hay opción vacía. */
  emptyLabel?: string
  error?: string
  help?: string
}

/** Reúne las opciones seguidas que comparten grupo. */
function groupsOf<T extends { group?: string }>(options: T[]): [string | undefined, T[]][] {
  const groups: [string | undefined, T[]][] = []
  for (const option of options) {
    const last = groups.at(-1)
    if (last && last[0] === option.group) last[1].push(option)
    else groups.push([option.group, [option]])
  }
  return groups
}

/** Lista desplegable con etiqueta, ayuda y mensaje de error. Mismo aspecto que Field. */
export default function Select({ id, label, icon, options, emptyLabel, error, help, ...rest }: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input-box ${error ? 'has-error' : ''}`}>
        {icon && <Icon name={icon} />}
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
          {...rest}
        >
          {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
          {groupsOf(options).map(([group, items]) => {
            const rendered = items.map((o) => (
              <option key={o.value} value={o.value}>
                {o.text}
              </option>
            ))
            return group ? (
              <optgroup key={group} label={group}>
                {rendered}
              </optgroup>
            ) : (
              rendered
            )
          })}
        </select>
      </div>
      {error ? (
        <p className="error" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        help && (
          <p className="help" id={`${id}-help`}>
            {help}
          </p>
        )
      )}
    </div>
  )
}
