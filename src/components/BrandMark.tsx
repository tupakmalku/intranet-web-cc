import { brand } from '../brand/index.ts'

interface Props {
  size?: number
  /** Fondo sobre el que va: claro (menú) o del color principal (ingreso). */
  on?: 'light' | 'dark'
}

/**
 * Logotipo de la institución en la versión que corresponde al fondo. Si solo
 * hay una versión, se usa en ambos. Sin logotipo se dibuja un isotipo genérico.
 */
export default function BrandMark({ size = 40, on = 'light' }: Props) {
  const logo = on === 'dark' ? (brand.logo?.onDark ?? brand.logo?.onLight) : (brand.logo?.onLight ?? brand.logo?.onDark)
  if (logo) return <img src={logo} alt={brand.institution} width={size} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l8 3v6c0 4.500-3.200 8-8 9-4.800-1-8-4.500-8-9V6zM8.700 12l2.300 2.300 4.300-4.600" />
    </svg>
  )
}
