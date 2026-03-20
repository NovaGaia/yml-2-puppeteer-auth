import { open, save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import type { Scenario } from '../types'

interface ImportResult {
  name: string
  content: string
  existing_id: string | null
}

interface Props {
  selected: Scenario | null
  onImported: (s: Scenario) => void
}

export default function ImportExportBar({ selected, onImported }: Props) {
  const handleImport = async () => {
    const filePath = await open({
      filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }],
    })
    if (!filePath) return

    const result = await invoke<ImportResult>('import_yaml', { filePath })

    let replaceId: string | null = null
    if (result.existing_id) {
      const replace = window.confirm(
        `Un scénario nommé "${result.name}" existe déjà.\n\nCliquez OK pour le remplacer, ou Annuler pour créer un doublon.`
      )
      replaceId = replace ? result.existing_id : null
    }

    const scenario = await invoke<Scenario>('confirm_import', {
      name: result.name,
      yamlContent: result.content,
      replaceId,
    })

    onImported(scenario)
  }

  const handleExport = async () => {
    if (!selected) return

    const filePath = await save({
      defaultPath: `${selected.name}.yml`,
      filters: [{ name: 'YAML', extensions: ['yml', 'yaml'] }],
    })
    if (!filePath) return

    await invoke('export_yaml', {
      filePath,
      yamlContent: selected.yaml_content,
    })
  }

  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderBottom: '1px solid #eee' }}>
      <button onClick={handleImport}>Importer YAML</button>
      <button onClick={handleExport} disabled={!selected}>
        Exporter YAML
      </button>
    </div>
  )
}
