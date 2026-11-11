/** Vistas de la intranet y su dirección. El menú lateral las muestra como secciones. */
export type IntranetView = 'mapa' | 'mios' | 'aprobar' | 'config'

export const VIEW_PATHS: Record<IntranetView, string> = {
  mapa: '/',
  mios: '/mis-documentos',
  aprobar: '/por-aprobar',
  config: '/configuracion',
}
