import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import ScenarioList from './components/ScenarioList'
import SplitEditor from './components/editor/SplitEditor'
import RunnerPanel from './components/runner/RunnerPanel'
import ImportExportBar from './components/ImportExportBar'
import { useScenario } from './hooks/useScenario'

export default function App() {
  const { scenarios, selected, setSelected, create, update, remove, reload } = useScenario()
  const [tab, setTab] = useState<'editor' | 'runner'>('editor')
  const [nodeError, setNodeError] = useState<string | null>(null)

  useEffect(() => {
    invoke<string>('check_node').catch((err: unknown) => {
      setNodeError(typeof err === 'string' ? err : 'Node.js introuvable')
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {nodeError && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '8px 16px',
          fontSize: 13,
          flexShrink: 0,
        }}>
          ⚠️ {nodeError}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: 240, borderRight: '1px solid #ddd', padding: 16 }}>
          <ScenarioList
            scenarios={scenarios}
            selected={selected}
            onSelect={setSelected}
            onCreate={create}
            onDelete={remove}
          />
        </aside>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ImportExportBar selected={selected} onImported={(s) => { setSelected(s); reload() }} />

          {selected ? (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
                {(['editor', 'runner'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: '8px 16px',
                      background: tab === t ? '#f0f0f0' : 'transparent',
                      border: 'none',
                      borderBottom: tab === t ? '2px solid #4f46e5' : '2px solid transparent',
                      cursor: 'pointer',
                      fontWeight: tab === t ? 600 : 400,
                    }}
                  >
                    {t === 'editor' ? 'Éditeur' : 'Runner'}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <div style={{ display: tab === 'editor' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
                  <SplitEditor value={selected.yaml_content} onChange={update} />
                </div>
                <div style={{ display: tab === 'runner' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
                  <RunnerPanel scenario={selected} />
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 16, color: '#999' }}>Sélectionner ou créer un scénario</div>
          )}
        </div>
      </div>
    </div>
  )
}
