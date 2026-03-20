import type { Scenario } from '../types'

interface Props {
  scenarios: Scenario[]
  selected: Scenario | null
  onSelect: (s: Scenario) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

export default function ScenarioList({ scenarios, selected, onSelect, onCreate, onDelete }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Scénarios</h2>
        <button onClick={onCreate} title="Nouveau scénario" style={{ cursor: 'pointer' }}>+</button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, overflowY: 'auto' }}>
        {scenarios.map((s) => (
          <li
            key={s.id}
            onClick={() => onSelect(s)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: 6,
              background: selected?.id === s.id ? '#e0e7ff' : 'transparent',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
              title="Supprimer"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
            >
              ×
            </button>
          </li>
        ))}
        {scenarios.length === 0 && (
          <li style={{ color: '#999', fontSize: 14 }}>Aucun scénario. Créez-en un →</li>
        )}
      </ul>
    </div>
  )
}
