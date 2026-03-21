import { useState } from 'react'
import type { Scenario } from '../types'

interface Props {
  scenarios: Scenario[]
  selected: Scenario | null
  onSelect: (s: Scenario) => void
  onCreate: () => void
  onRename: (name: string) => void
  onDelete: (id: string) => void
}

export default function ScenarioList({ scenarios, selected, onSelect, onCreate, onRename, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  function startEdit(s: Scenario, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(s.id)
    setEditingName(s.name)
  }

  function commitEdit() {
    if (editingName.trim()) onRename(editingName.trim())
    setEditingId(null)
  }

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
            onClick={() => { if (editingId !== s.id) onSelect(s) }}
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
            {editingId === s.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, fontSize: 14, border: '1px solid #a5b4fc', borderRadius: 4, padding: '2px 6px', marginRight: 4 }}
              />
            ) : (
              <span
                onDoubleClick={(e) => startEdit(s, e)}
                title="Double-cliquer pour renommer"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
              >
                {s.name}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
              title="Supprimer"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', flexShrink: 0 }}
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
