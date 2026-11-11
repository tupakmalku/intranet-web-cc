/** Insignia de habilitado o inhabilitado, para usuarios. */
export default function StatusBadge({ active }: { active: boolean }) {
  return <span className={`badge ${active ? 'badge-active' : 'badge-inactive'}`}>{active ? 'Habilitado' : 'Inhabilitado'}</span>
}
