import type { User } from '../../domain/types.ts'
import { formatBirthday, greetingMailto, whenText, type upcomingBirthdays } from '../../lib/birthdays.ts'
import Avatar from '../Avatar.tsx'
import Button from '../ui/Button.tsx'
import Icon from '../ui/Icon.tsx'
import Modal from '../ui/Modal.tsx'

interface Props {
  upcoming: ReturnType<typeof upcomingBirthdays<User>>
  days: number
  me: User
  onProfile: () => void
  onClose: () => void
}

/** Lista de cumpleaños de hoy y los próximos días, con saludo por correo para los de hoy. */
export default function BirthdayList({ upcoming, days, me, onProfile, onClose }: Props) {
  return (
    <Modal
      title="Cumpleaños"
      description={`Hoy y los próximos ${days} días.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            Cerrar
          </Button>
          <Button icon="cake" onClick={onProfile}>
            {me.birthday ? 'Cambiar mi cumpleaños' : 'Registrar mi cumpleaños'}
          </Button>
        </>
      }
    >
      {upcoming.length ? (
        <ul className="birthday-list">
          {upcoming.map((p) => (
            <li key={p.id} className={p.days === 0 ? 'is-today' : ''}>
              <Avatar user={p} size={40} />
              <span className="birthday-list-name">
                {p.fullName}
                {p.id === me.id && <small> (tú)</small>}
                <small>{formatBirthday(p.birthday)}</small>
              </span>
              {p.days === 0 && p.id !== me.id ? (
                <a className="button button-secondary button-small" href={greetingMailto(p, me.fullName)}>
                  <Icon name="mail" size={16} />
                  Saludar
                </a>
              ) : (
                <span className="birthday-list-when">{whenText(p.days)}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="help">Nadie cumple años en los próximos {days} días.</p>
      )}
    </Modal>
  )
}
