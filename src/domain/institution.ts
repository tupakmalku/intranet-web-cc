import type { InstitutionProfile } from './types.ts'

/** Qué se muestra de la identidad en la pantalla de ingreso. */
export const LOGIN_HIGHLIGHTS: Record<InstitutionProfile['loginHighlight'], string> = {
  all: 'Todo',
  mission: 'La misión',
  values: 'Los valores',
  none: 'Nada',
}

/* Identidad institucional: valores vacíos y reglas compartidas. */

export const EMPTY_INSTITUTION: InstitutionProfile = {
  mission: '',
  vision: '',
  values: [],
  qualityPolicy: '',
  qualityDocumentCode: null,
  loginHighlight: 'all',
}

/** ¿Tiene algo que mostrar? Si no, la pantalla de ingreso no muestra el resumen. */
export const hasInstitutionContent = (p: InstitutionProfile) => !!(p.mission || p.vision || p.values.length || p.qualityPolicy)

/** Limpia lo que llega del formulario: sin espacios sobrantes ni valores vacíos o repetidos. */
export function cleanInstitution(p: InstitutionProfile): InstitutionProfile {
  const values = [...new Set(p.values.map((v) => v.trim()).filter(Boolean))]
  return {
    mission: p.mission.trim(),
    vision: p.vision.trim(),
    values,
    qualityPolicy: p.qualityPolicy.trim(),
    qualityDocumentCode: p.qualityDocumentCode?.trim() || null,
    loginHighlight: p.loginHighlight,
  }
}
