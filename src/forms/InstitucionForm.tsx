import { useState } from 'react'
import { backend } from '../backend/index.ts'
import FormModal from '../components/ui/FormModal.tsx'
import SegmentedControl from '../components/ui/SegmentedControl.tsx'
import Select from '../components/ui/Select.tsx'
import TextArea from '../components/ui/TextArea.tsx'
import { LOGIN_HIGHLIGHTS } from '../domain/institution.ts'
import type { InstitutionProfile, IntranetDocument } from '../domain/types.ts'
import { useSubmit } from '../lib/useSubmit.ts'

interface Props {
  profile: InstitutionProfile
  /** Documentos publicados, para enlazar el de la política de calidad. */
  documents: IntranetDocument[]
  onSaved: () => void
  onClose: () => void
}

const HIGHLIGHTS = Object.entries(LOGIN_HIGHLIGHTS).map(([value, text]) => ({ value, text }))

/** Edita la misión, la visión, los valores y la política de calidad. */
export default function InstitucionForm({ profile, documents, onSaved, onClose }: Props) {
  const [mission, setMission] = useState(profile.mission)
  const [vision, setVision] = useState(profile.vision)
  // Un valor por línea: lo más simple de editar y de reordenar.
  const [values, setValues] = useState(profile.values.join('\n'))
  const [qualityPolicy, setQualityPolicy] = useState(profile.qualityPolicy)
  const [qualityDocumentCode, setQualityDocumentCode] = useState(profile.qualityDocumentCode ?? '')
  const [loginHighlight, setLoginHighlight] = useState(profile.loginHighlight)
  const { saving, failure, submit } = useSubmit()

  // Un código por documento (la versión publicada vigente), ordenados.
  const codes = [...new Map(documents.map((d) => [d.code, d])).values()].sort((a, b) => a.code.localeCompare(b.code, 'es'))

  async function handleSubmit() {
    const saved = await submit(async () => {
      await backend.institution.save({
        mission,
        vision,
        values: values.split('\n'),
        qualityPolicy,
        qualityDocumentCode: qualityDocumentCode || null,
        loginHighlight,
      })
    })
    if (saved) onSaved()
  }

  return (
    <FormModal
      title="Identidad institucional"
      description="Se muestra en la pantalla de ingreso. Es información pública: se ve sin iniciar sesión."
      size="wide"
      submitLabel="Guardar"
      saving={saving}
      failure={failure}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className="field-pair">
        <TextArea id="inst-mission" label="Misión" rows={5} value={mission} onChange={(e) => setMission(e.target.value)} />
        <TextArea id="inst-vision" label="Visión" rows={5} value={vision} onChange={(e) => setVision(e.target.value)} />
      </div>
      <div className="field-pair">
        <TextArea id="inst-values" label="Valores (uno por línea)" rows={6} value={values} onChange={(e) => setValues(e.target.value)} />
        <TextArea id="inst-quality" label="Política de calidad" rows={6} value={qualityPolicy} onChange={(e) => setQualityPolicy(e.target.value)} />
      </div>
      <div className="field-pair">
        <Select
          id="inst-quality-doc"
          label="Documento oficial de la política de calidad"
          icon="file"
          emptyLabel="Sin enlace"
          options={codes.map((d) => ({ value: d.code, text: `${d.code} · ${d.title}` }))}
          value={qualityDocumentCode}
          onChange={(e) => setQualityDocumentCode(e.target.value)}
          help="Se enlaza siempre la versión publicada vigente."
        />
        <SegmentedControl
          id="inst-login"
          label="En la pantalla de ingreso mostrar"
          options={HIGHLIGHTS}
          value={loginHighlight}
          onChange={(v) => setLoginHighlight(v as InstitutionProfile['loginHighlight'])}
        />
      </div>
    </FormModal>
  )
}
