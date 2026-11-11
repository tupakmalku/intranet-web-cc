import { useOutletContext } from 'react-router-dom'

/** Lo que la estructura de la aplicación (AppLayout) comparte con cada sección. */
export interface LayoutContext {
  /** Lugar de la cabecera donde la sección puede dibujar su buscador, con createPortal. Null hasta montarse. */
  topbarSlot: HTMLElement | null
  /** Vuelve a contar los documentos del menú (Mis documentos, Por aprobar) tras un cambio. */
  refreshCounts: () => void
  /** Vuelve a leer los compañeros (cumpleaños y fotos) tras editar usuarios. */
  refreshBirthdays: () => void
}

export const useLayout = () => useOutletContext<LayoutContext>()
