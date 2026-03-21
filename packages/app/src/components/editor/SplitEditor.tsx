import BlockEditor from './BlockEditor'
import YamlEditor from './YamlEditor'
import { useStepSync } from '../../hooks/useStepSync'

interface Props {
  value: string
  onChange: (yaml: string) => void
}

export default function SplitEditor({ value, onChange }: Props) {
  const { steps, onStepsChange, url, onUrlChange, verification, onVerificationChange, onYamlEdit, localYaml, yamlError } = useStepSync({
    yaml: value,
    onYamlChange: onChange,
  })

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left pane — block editor */}
      <div style={{
        width: '40%', minWidth: 280, maxWidth: 480,
        borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <BlockEditor steps={steps} onStepsChange={onStepsChange} url={url} onUrlChange={onUrlChange} verification={verification} onVerificationChange={onVerificationChange} />
      </div>

      {/* Right pane — YAML editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {yamlError && (
          <div style={{
            background: '#fef2f2', borderBottom: '1px solid #fecaca',
            color: '#991b1b', padding: '4px 12px', fontSize: 12, flexShrink: 0,
          }}>
            YAML invalide — les blocs ne sont pas mis à jour
          </div>
        )}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {/* debounceMs={0} : useStepSync gère déjà le debounce de 300ms */}
          <YamlEditor value={localYaml} onChange={onYamlEdit} debounceMs={0} />
        </div>
      </div>
    </div>
  )
}
