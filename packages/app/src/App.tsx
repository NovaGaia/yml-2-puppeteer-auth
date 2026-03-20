import ScenarioList from './components/ScenarioList'
import YamlEditor from './components/editor/YamlEditor'
import { useScenario } from './hooks/useScenario'

export default function App() {
  const { scenarios, selected, setSelected, create, update, remove } = useScenario()

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <aside style={{ width: 240, borderRight: '1px solid #ddd', padding: 16, display: 'flex', flexDirection: 'column' }}>
        <ScenarioList
          scenarios={scenarios}
          selected={selected}
          onSelect={setSelected}
          onCreate={create}
          onDelete={remove}
        />
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selected ? (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
              <strong>{selected.name}</strong>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <YamlEditor
                value={selected.yaml_content}
                onChange={update}
              />
            </div>
          </>
        ) : (
          <div style={{ padding: 16, color: '#999' }}>Sélectionner ou créer un scénario</div>
        )}
      </main>
    </div>
  )
}
