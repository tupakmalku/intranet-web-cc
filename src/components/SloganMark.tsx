import { brand } from '../brand/index.ts'

/**
 * El eslogan de la institución como su pieza gráfica: una parte destacada en un
 * recuadro y el resto en letra manuscrita con un trazo debajo (brand.sloganDisplay).
 * Si la institución no lo configura, el eslogan como texto con la última palabra
 * en el color de acento. Pensado para fondos del color principal.
 */
export default function SloganMark({ className = '' }: { className?: string }) {
  const display = brand.sloganDisplay
  if (!display) {
    const words = brand.slogan.trim().split(/\s+/)
    const last = words.pop() ?? ''
    return (
      <p className={`slogan-plain ${className}`}>
        {words.join(' ')} <span>{last}</span>
      </p>
    )
  }
  return (
    // Para lectores de pantalla, el eslogan completo; lo visual va oculto para ellos.
    <p className={`slogan-mark ${className}`} aria-label={brand.slogan}>
      <span className="slogan-highlight" aria-hidden="true">
        {display.highlight}
      </span>
      <span className="slogan-script" aria-hidden="true">
        {display.script}
        <svg className="slogan-swoosh" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
          <path d="M4 12 C 80 4, 200 2, 296 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </span>
    </p>
  )
}
