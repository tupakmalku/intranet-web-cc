import type { User } from '../../domain/types.ts'
import { formatBirthday, namesText, whenText, type upcomingBirthdays } from '../../lib/birthdays.ts'
import Avatar from '../Avatar.tsx'
import Icon from '../ui/Icon.tsx'

type Upcoming = ReturnType<typeof upcomingBirthdays<User>>

interface Props {
  /** Cumpleaños de hoy y los próximos días, ya ordenados. */
  upcoming: Upcoming
  me: User
  onOpen: () => void
}

/**
 * Tarjeta del pie del menú: quién cumple hoy o el próximo cumpleaños (todos
 * los de ese día), con sus fotos. Al pulsarla abre la celebración o la lista.
 */
export default function BirthdayCard({ upcoming, me, onOpen }: Props) {
  const todays = upcoming.filter((p) => p.days === 0)
  const next = upcoming.find((p) => p.days > 0)
  const group = todays.length ? todays : next ? upcoming.filter((p) => p.days === next.days) : []
  const nameOf = (p: Upcoming[number]) => (p.id === me.id ? `${p.fullName} (tú)` : p.fullName)

  let label: string
  let detail: string | undefined
  if (todays.some((p) => p.id === me.id)) {
    label = '¡Hoy es tu cumpleaños!'
  } else if (todays.length) {
    label = todays.length === 1 ? 'Hoy cumple años' : 'Hoy cumplen años'
  } else if (next) {
    // El «cuándo» va en la etiqueta: se ve también en la tarjeta compacta.
    label = `${group.length === 1 ? 'Próximo cumpleaños' : 'Próximos cumpleaños'} · ${whenText(next.days)}`
    detail = formatBirthday(next.birthday)
  } else {
    label = 'Cumpleaños'
  }

  return (
    <button type="button" className={`birthday-card${todays.length ? ' is-today' : ''}`} onClick={onOpen}>
      <span className="birthday-card-label">
        <Icon name="cake" size={16} />
        {label}
      </span>
      {group.length > 0 && (
        <span className="birthday-card-faces" aria-hidden="true">
          {group.slice(0, 4).map((p) => (
            <Avatar key={p.id} user={p} size={34} />
          ))}
          {group.length > 4 && <span className="birthday-card-more">+{group.length - 4}</span>}
        </span>
      )}
      <strong>{group.length ? namesText(group.map(nameOf)) : 'Nadie cumple en los próximos días'}</strong>
      {detail && <small className="birthday-card-detail">{detail}</small>}
      {!me.birthday && <small className="birthday-card-hint">Registra tu cumpleaños</small>}
    </button>
  )
}
