interface Option<T extends string> {
  value: T
  label: string
  /** Explicación bajo la opción. */
  detail?: string
}

interface Props<T extends string> {
  /** Nombre del grupo (atributo name de los botones de opción). */
  name: string
  legend: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

/** Lista de opciones excluyentes con su explicación, una debajo de otra. Para pocas opciones cortas, SegmentedControl. */
export default function RadioList<T extends string>({ name, legend, options, value, onChange, disabled }: Props<T>) {
  return (
    <fieldset className="checkbox-group">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="checkbox">
          <input type="radio" name={name} value={option.value} checked={option.value === value} onChange={() => onChange(option.value)} disabled={disabled} />
          <span>
            {option.label}
            {option.detail && <small>{option.detail}</small>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
