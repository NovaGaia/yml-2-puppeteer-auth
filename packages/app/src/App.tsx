import ScenarioList from './components/ScenarioList'
import YamlEditor from './components/editor/YamlEditor'
import RunnerPanel from './components/runner/RunnerPanel'
import ImportExportBar from './components/ImportExportBar'
import { useScenario } from './hooks/useScenario'
import { useState } from 'react'

export default function App() {
  const { scenarios, selected, setSelected, create, update, remove, reload } = useScenario()
  const [tab, setTab] = useState<'editor' | 'runner'>('editor')

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
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
                  {t === 'editor' ? 'YAML' : 'Runner'}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              {tab === 'editor' ? (
                <YamlEditor value={selected.yaml_content} onChange={update} />
              ) : (
                <RunnerPanel scenario={selected} />
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: 16, color: '#999' }}>Sélectionner ou créer un scénario</div>
        )}
      </div>
    </div>
  )
}
