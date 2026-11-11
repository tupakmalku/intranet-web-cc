import type { InstitutionProfile } from '../../domain/types.ts'
import InstitutionBlock from './InstitutionBlock.tsx'
import ValueChips from './ValueChips.tsx'

/**
 * Misión, visión, valores y política de calidad en bloques compactos sobre el
 * color principal, para la pantalla de ingreso. Muestra lo que pida el perfil
 * (`loginHighlight`): todo, una parte o nada.
 */
export default function InstitutionSummary({ profile }: { profile: InstitutionProfile }) {
  const show = (part: 'mission' | 'values') => profile.loginHighlight === 'all' || profile.loginHighlight === part
  const blocks = [
    show('mission') && profile.mission && (
      <InstitutionBlock key="mission" title="Misión" icon="target" variant="login">
        <p>{profile.mission}</p>
      </InstitutionBlock>
    ),
    profile.loginHighlight === 'all' && profile.vision && (
      <InstitutionBlock key="vision" title="Visión" icon="eye" variant="login">
        <p>{profile.vision}</p>
      </InstitutionBlock>
    ),
    show('values') && profile.values.length > 0 && (
      <InstitutionBlock key="values" title="Valores" icon="award" variant="login">
        <ValueChips values={profile.values} tone="dark" />
      </InstitutionBlock>
    ),
    profile.loginHighlight === 'all' && profile.qualityPolicy && (
      <InstitutionBlock key="quality" title="Política de calidad" icon="clipboardCheck" variant="login">
        <p>{profile.qualityPolicy}</p>
      </InstitutionBlock>
    ),
  ].filter(Boolean)

  if (!blocks.length) return null
  return <div className="institution-summary">{blocks}</div>
}
