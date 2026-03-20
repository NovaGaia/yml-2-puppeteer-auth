import ScenarioList from './components/ScenarioList'
import { useScenario } from './hooks/useScenario'

export default function App() {
  const { scenarios, selected, setSelected, create, remove } = useScenario()

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
      <main style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {selected
          ? <p>Scénario sélectionné : {selected.name}</p>
          : <p style={{ color: '#999' }}>Sélectionner ou créer un scénario</p>
        }
      </main>
    </div>
  )
}
