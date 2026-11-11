import { useEffect, useId, useRef, type CSSProperties } from 'react'
import { brand } from '../../brand/index.ts'
import type { User } from '../../domain/types.ts'
import { firstName, greetingMailto, type upcomingBirthdays } from '../../lib/birthdays.ts'
import Avatar from '../Avatar.tsx'
import Button from '../ui/Button.tsx'
import Icon from '../ui/Icon.tsx'

interface Props {
  /** Quienes cumplen años hoy (habilitados). */
  people: User[]
  /** Quienes cumplen en los próximos días, para preparar algo. */
  soon: ReturnType<typeof upcomingBirthdays<User>>
  me: User
  onMore: () => void
  onClose: () => void
}

/** Papelitos del confeti: posición, retraso, giro y color fijos (sin aleatorio en cada render). */
const CONFETTI = Array.from({ length: 64 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 7) % 14) / 10,
  duration: 2.8 + ((i * 13) % 18) / 10,
  rotate: (i * 47) % 360,
  tone: i % 5,
  shape: i % 3,
}))

/**
 * Columnas para repartir `count` tarjetas sin huecos: 1, 2 y 3 en una fila;
 * 4 en dos filas de 2; desde 5, filas de 3 (la última se estira).
 */
const columnsFor = (count: number) => (count <= 3 ? count : count === 4 ? 2 : 3)

/** "mañana, miércoles 11" o "viernes 13 · en 3 días". */
function soonText(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const day = date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric' })
  return days === 1 ? `mañana, ${day}` : `${day} · en ${days} días`
}

/**
 * Celebración de cumpleaños: se abre sola una vez al día cuando alguien cumple
 * años hoy o en los próximos días. A quien cumple lo felicita; a los demás los
 * invita a saludar (por correo) y a preparar algo para los que se acercan.
 */
export default function BirthdayCelebration({ people, soon, me, onMore, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const mine = people.some((p) => p.id === me.id)
  const others = people.filter((p) => p.id !== me.id)
  const today = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    const d = dialog.current!
    if (!d.open) d.showModal()
    return () => d.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="celebration"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="celebration-confetti" aria-hidden="true">
        {CONFETTI.map((c, i) => (
          <i
            key={i}
            className={`confetti-${c.shape} confetti-tone-${c.tone}`}
            style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s`, rotate: `${c.rotate}deg` } as CSSProperties}
          />
        ))}
      </div>

      <button type="button" className="icon-button celebration-close" onClick={onClose} aria-label="Cerrar">
        <Icon name="close" />
      </button>

      <header className="celebration-hero">
        <p className="celebration-date">{today}</p>
        {mine ? (
          <>
            <Avatar user={me} size={136} className="celebration-photo" />
            <h2 id={titleId}>¡Feliz cumpleaños, {firstName(me.fullName)}!</h2>
            <p>Todo el equipo de {brand.shortName} te desea un día lleno de alegría.</p>
          </>
        ) : others.length === 0 ? (
          <>
            <span className="celebration-icon">
              <Icon name="gift" size={34} />
            </span>
            <h2 id={titleId}>Se acercan cumpleaños</h2>
            <p>Prepara algo lindo para tus compañeros: un detalle, una tarjeta o un saludo especial.</p>
          </>
        ) : (
          <>
            <span className="celebration-icon">
              <Icon name="cake" size={34} />
            </span>
            <h2 id={titleId}>{others.length === 1 ? 'Hoy cumple años' : '¡Hoy celebramos!'}</h2>
            <p>
              {others.length === 1
                ? `Tómate un momento para saludar a ${firstName(others[0].fullName)}.`
                : `${others.length} compañeros cumplen años hoy. Tómate un momento para saludarlos.`}
            </p>
          </>
        )}
      </header>

      {(others.length > 0 || soon.length > 0) && (
        <div className="celebration-body">
          {mine && others.length > 0 && <p className="celebration-also">También cumplen años hoy</p>}
          {others.length > 0 && (
            <ul
              className={`celebration-people${others.length === 1 ? ' is-single' : ''}`}
              style={{ '--columns': columnsFor(others.length) } as CSSProperties}
            >
              {others.map((p) => (
                <li key={p.id}>
                  <Avatar user={p} size={others.length === 1 ? 128 : 96} className="celebration-photo" />
                  <strong>{p.fullName}</strong>
                  <a className="button button-primary button-small" href={greetingMailto(p, me.fullName)}>
                    <Icon name="mail" size={16} />
                    Enviar saludo
                  </a>
                </li>
              ))}
            </ul>
          )}

          {soon.length > 0 && (
            <section className="celebration-soon" aria-label="Próximos cumpleaños">
              <h3>
                <Icon name="gift" size={18} />
                {mine || others.length ? 'Se acercan · prepara algo lindo' : 'En los próximos días'}
              </h3>
              <ul style={{ '--columns': columnsFor(soon.length) } as CSSProperties}>
                {soon.map((p) => (
                  <li key={p.id}>
                    <Avatar user={p} size={48} />
                    <span>
                      <strong>
                        {p.fullName}
                        {p.id === me.id && ' (tú)'}
                      </strong>
                      <small>{soonText(p.days)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <footer className="celebration-footer">
        <Button variant="text" onClick={onMore}>
          Ver próximos cumpleaños
        </Button>
        <Button onClick={onClose}>{mine ? '¡Gracias!' : 'Listo'}</Button>
      </footer>
    </dialog>
  )
}
