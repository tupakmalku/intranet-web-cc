interface Option {
  value: string
  text: string
}

interface Props {
  id: string
  label: string
  options: Option[]
  /** Valor elegido, o '' si no hay ninguno. */
  value: string
  onChange: (value: string) => void
  error?: string
}

/**
 * Selector de pocas opciones que se ven todas a la vez, una junto a otra, y se
 * elige con un toque. Para listas largas conviene Select. Por dentro son botones
 * de opción, así que funciona con el teclado (flechas) y con lectores de pantalla.
 */
export default function SegmentedControl({ id, label, options, value, onChange, error }: Props) {
  return (
    <fieldset className="field segmented" aria-describedby={error ? `${id}-error` : undefined}>
      <legend>{label}</legend>
      <div className={`segmented-track ${error ? 'has-error' : ''}`}>
        {options.map((option, i) => (
          <label key={option.value} className={option.value === value ? 'selected' : ''}>
            <input
              type="radio"
              // El primero lleva el id del campo, para poder enfocarlo cuando hay un error.
              id={i === 0 ? id : `${id}-${i}`}
              name={id}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
      {error && (
        <p className="error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
