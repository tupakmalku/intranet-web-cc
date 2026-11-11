import Icon from '../ui/Icon.tsx'

/**
 * Valores en una cinta que se desplaza sin fin. La lista va dos veces seguidas
 * para que el giro no se note; la copia se oculta a los lectores de pantalla.
 * Sin movimiento si el usuario lo desactivó en su sistema (ver institution.css).
 */
export default function ValueMarquee({ values }: { values: string[] }) {
  const items = (copy: boolean) =>
    values.map((value) => (
      <li key={`${copy}-${value}`} aria-hidden={copy || undefined}>
        <Icon name="check" size={14} />
        {value}
      </li>
    ))
  return (
    <div className="value-marquee">
      <ul style={{ animationDuration: `${Math.max(20, values.length * 4)}s` }}>
        {items(false)}
        {items(true)}
      </ul>
    </div>
  )
}
