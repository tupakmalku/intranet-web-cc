import type { CSSProperties } from 'react'
import type { InstitutionProfile } from '../../domain/types.ts'
import InstitutionBlock from './InstitutionBlock.tsx'
import ValueMarquee from './ValueMarquee.tsx'

/**
 * Misión, visión y política de calidad en tarjetas tipo mosaico, y los valores
 * en una cinta en movimiento, para la pantalla de ingreso. Muestra lo que pida
 * el perfil (`loginHighlight`): todo, una parte o nada. Las tarjetas entran una
 * tras otra (--order).
 */
export default function InstitutionSummary({ profile }: { profile: InstitutionProfile }) {
  const all = profile.loginHighlight === 'all'
  const cards = [
    (all || profile.loginHighlight === 'mission') && profile.mission && { key: 'mission', title: 'Misión', icon: 'target' as const, text: profile.mission },
    all && profile.vision && { key: 'vision', title: 'Visión', icon: 'eye' as const, text: profile.vision },
    all && profile.qualityPolicy && { key: 'quality', title: 'Política de calidad', icon: 'clipboardCheck' as const, text: profile.qualityPolicy, wide: true },
  ].filter((c) => !!c)
  const showValues = (all || profile.loginHighlight === 'values') && profile.values.length > 0

  if (!cards.length && !showValues) return null
  return (
    <div className={`institution-summary${cards.length === 1 ? ' is-single' : ''}`}>
      {cards.map((card, i) => (
        <div key={card.key} className={`summary-card${card.wide ? ' is-wide' : ''}`} style={{ '--order': i } as CSSProperties}>
          <InstitutionBlock title={card.title} icon={card.icon} variant="login">
            <p>{card.text}</p>
          </InstitutionBlock>
        </div>
      ))}
      {showValues && (
        <div className="summary-card is-wide summary-values" style={{ '--order': cards.length } as CSSProperties}>
          <span className="summary-label">Nuestros valores</span>
          <ValueMarquee values={profile.values} />
        </div>
      )}
    </div>
  )
}
