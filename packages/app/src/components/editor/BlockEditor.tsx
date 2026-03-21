import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Step, Verification } from '../../types'
import StepBlock from './StepBlock'
import VerificationBlock from './VerificationBlock'

function SortableStepBlock({
  id, step, index, onChange, onDelete,
}: {
  id: string; step: Step; index: number
  onChange: (s: Step) => void; onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <StepBlock step={step} index={index}
        dragHandleProps={{ ...attributes, ...listeners }}
        onChange={onChange} onDelete={onDelete} />
    </div>
  )
}

interface Props {
  steps: Step[]
  onStepsChange: (steps: Step[]) => void
  url: string
  onUrlChange: (url: string) => void
  verification: Verification[]
  onVerificationChange: (verification: Verification[]) => void
}

export default function BlockEditor({ steps, onStepsChange, url, onUrlChange, verification, onVerificationChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ids = steps.map((_, i) => `step-${i}`)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    onStepsChange(arrayMove(steps, oldIndex, newIndex))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
        <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>URL d'authentification</label>
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com/login"
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 12, padding: '4px 8px',
            border: '1px solid #d1d5db', borderRadius: 4,
            fontFamily: 'inherit',
          }}
        />
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
          {steps.length} step{steps.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {steps.map((step, i) => (
              <SortableStepBlock
                key={`step-${i}`} id={`step-${i}`}
                step={step} index={i}
                onChange={(updated) => onStepsChange(steps.map((s, j) => j === i ? updated : s))}
                onDelete={() => onStepsChange(steps.filter((_, j) => j !== i))}
              />
            ))}
          </SortableContext>
        </DndContext>

        {steps.length === 0 && (
          <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
            Aucun step — cliquez sur "+ Ajouter" pour commencer
          </div>
        )}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={() => onStepsChange([...steps, { action: 'click', selector: '' }])}
          style={{
            width: '100%', padding: '6px 0',
            background: '#f3f4f6', border: '1px dashed #d1d5db',
            borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#4b5563',
          }}>
          + Ajouter un step
        </button>
      </div>

      {/* ── Verification section ── */}
      <div style={{ borderTop: '2px solid #e5e7eb', padding: '8px 12px 4px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Vérification
        </div>
      </div>

      <div style={{ overflowY: 'auto', padding: '0 12px 8px' }}>
        {verification.map((v, i) => (
          <VerificationBlock
            key={i}
            verification={v}
            index={i}
            onChange={(updated) => onVerificationChange(verification.map((item, j) => j === i ? updated : item))}
            onDelete={() => onVerificationChange(verification.filter((_, j) => j !== i))}
          />
        ))}
        {verification.length === 0 && (
          <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
            Aucune vérification configurée
          </div>
        )}
      </div>

      <div style={{ padding: '4px 12px 12px' }}>
        <button
          onClick={() => onVerificationChange([...verification, { type: 'url', contains: '', required: true }])}
          style={{
            width: '100%', padding: '6px 0',
            background: '#f3f4f6', border: '1px dashed #d1d5db',
            borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#4b5563',
          }}>
          + Ajouter une vérification
        </button>
      </div>
    </div>
  )
}
