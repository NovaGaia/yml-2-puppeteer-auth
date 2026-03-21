# Block Editor (Split-View) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a drag & drop block editor (left pane) synchronized bidirectionally with the existing YAML editor (right pane) as a split-view that replaces the current single-pane YAML tab in the Tauri desktop app.

**Architecture:** A new `SplitEditor` component orchestrates the split-view. A `useStepSync` hook owns all bidirectional sync logic (YAML parsing → steps, steps serialization → YAML patch) as pure functions, keeping the sync logic fully testable without DOM. The left pane renders draggable `StepBlock` components via `@dnd-kit/sortable` inside `BlockEditor`. The right pane is the existing `YamlEditor`. `App.tsx` replaces its `YamlEditor` usage with `SplitEditor`. Note: `YamlEditor` must receive `debounceMs={0}` from `SplitEditor` — `useStepSync` already owns the 300ms debounce; a double debounce would delay sync to 600ms.

**Tech Stack:** React 18, TypeScript, `@dnd-kit/core` + `@dnd-kit/sortable`, `js-yaml` (already in deps), vitest (already in devDeps), CodeMirror 6 via `@uiw/react-codemirror` (already in deps).

---

## File Structure

```
packages/app/
├── package.json                                    # MODIFY — add @dnd-kit/core, @dnd-kit/sortable
├── src/
│   ├── App.tsx                                     # MODIFY — replace YamlEditor with SplitEditor in editor tab
│   ├── types.ts                                    # MODIFY — add Step union type and ACTION_TYPES
│   ├── components/
│   │   └── editor/
│   │       ├── YamlEditor.tsx                      # NO CHANGE
│   │       ├── BlockEditor.tsx                     # CREATE — @dnd-kit sortable list of StepBlocks
│   │       ├── StepBlock.tsx                       # CREATE — form UI per action type
│   │       └── SplitEditor.tsx                     # CREATE — split-view container, wires sync
│   └── hooks/
│       ├── useScenario.ts                          # NO CHANGE
│       └── useStepSync.ts                          # CREATE — pure sync functions + hook
```

**Responsibility boundaries:**
- `types.ts` — Step union type is the shared contract between all components
- `useStepSync.ts` — owns ALL parsing/serialization logic; components are dumb consumers
- `StepBlock.tsx` — renders and edits a single step; no YAML awareness
- `BlockEditor.tsx` — owns drag & drop ordering; no YAML awareness
- `SplitEditor.tsx` — wires everything together; passes `debounceMs={0}` to `YamlEditor`

---

## Task 1 — Dépendances + types Step

**Files:**
- Modify: `packages/app/package.json`
- Modify: `packages/app/src/types.ts`

- [ ] **Step 1 : Ajouter `@dnd-kit/core` et `@dnd-kit/sortable` dans `package.json`**

Dans `packages/app/package.json`, ajouter dans `"dependencies"` :

```json
"@dnd-kit/core": "^6",
"@dnd-kit/sortable": "^8"
```

- [ ] **Step 2 : Installer les dépendances**

```bash
cd packages/app && pnpm install
```

Résultat attendu : `@dnd-kit/core` et `@dnd-kit/sortable` apparaissent dans `node_modules`.

- [ ] **Step 3 : Ajouter les types Step dans `packages/app/src/types.ts`**

Remplacer le contenu entier du fichier par :

```typescript
export interface Scenario {
  id: string
  name: string
  yaml_content: string
  created_at: number
  updated_at: number
}

// ─── Step types ───────────────────────────────────────────────────────────────

export interface FillStep {
  action: 'fill'
  selector: string
  valueEnv: string
  valueType?: 'totp'
}

export interface WaitForSelectorStep {
  action: 'waitForSelector'
  selector: string
  timeout?: number
  errorSelector?: string
}

export interface ClickStep {
  action: 'click'
  selector: string
}

export interface WaitForNavigationStep {
  action: 'waitForNavigation'
  waitUntil?: string
  timeout?: number
}

export interface AssertNotPresentStep {
  action: 'assertNotPresent'
  selector: string
}

export interface WaitStep {
  action: 'wait'
  duration: number
}

export type Step =
  | FillStep
  | WaitForSelectorStep
  | ClickStep
  | WaitForNavigationStep
  | AssertNotPresentStep
  | WaitStep

export type ActionType = Step['action']

export const ACTION_TYPES: ActionType[] = [
  'fill',
  'waitForSelector',
  'click',
  'waitForNavigation',
  'assertNotPresent',
  'wait',
]
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
cd packages/app && pnpm exec tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add packages/app/package.json packages/app/src/types.ts
git commit -m "feat(block-editor): add @dnd-kit deps and Step union types"
```

---

## Task 2 — `useStepSync.ts` — fonctions pures + tests (TDD)

**Files:**
- Create: `packages/app/src/hooks/useStepSync.ts`
- Create: `packages/app/src/hooks/useStepSync.test.ts`

Le cœur de ce hook est constitué de deux fonctions pures exportées qui peuvent être testées sans DOM :
- `yamlToSteps(yaml: string): Step[] | null` — parse le YAML, extrait `authentication.steps`, retourne `null` si syntaxe invalide
- `patchYamlSteps(yaml: string, steps: Step[]): string` — remplace uniquement la section `authentication.steps` dans le YAML existant, préserve tout le reste (verification, options, etc.)

- [ ] **Step 1 : Créer `packages/app/src/hooks/useStepSync.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { yamlToSteps, patchYamlSteps } from './useStepSync'

// ─── yamlToSteps ──────────────────────────────────────────────────────────────

describe('yamlToSteps', () => {
  it('retourne null si le YAML est syntaxiquement invalide', () => {
    expect(yamlToSteps(':: invalid ::')).toBeNull()
  })

  it('retourne un tableau vide si authentication.steps est absent', () => {
    const yaml = `name: "test"\nauthentication:\n  url: "https://example.com"\n`
    expect(yamlToSteps(yaml)).toEqual([])
  })

  it('parse un step fill correctement', () => {
    const yaml = `
authentication:
  steps:
    - action: fill
      selector: "input[type='email']"
      valueEnv: "LOGIN_VALUE"
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'fill', selector: "input[type='email']", valueEnv: 'LOGIN_VALUE' },
    ])
  })

  it('parse un step fill avec valueType totp', () => {
    const yaml = `
authentication:
  steps:
    - action: fill
      selector: "input[name='otp']"
      valueEnv: "TOTP_SECRET"
      valueType: totp
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'fill', selector: "input[name='otp']", valueEnv: 'TOTP_SECRET', valueType: 'totp' },
    ])
  })

  it('parse un step waitForSelector avec options optionnelles', () => {
    const yaml = `
authentication:
  steps:
    - action: waitForSelector
      selector: "input[type='email']"
      timeout: 10000
      errorSelector: ".error-banner"
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'waitForSelector', selector: "input[type='email']", timeout: 10000, errorSelector: '.error-banner' },
    ])
  })

  it('parse un step click', () => {
    const yaml = `
authentication:
  steps:
    - action: click
      selector: "button[type='submit']"
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'click', selector: "button[type='submit']" },
    ])
  })

  it('parse un step waitForNavigation avec champs optionnels', () => {
    const yaml = `
authentication:
  steps:
    - action: waitForNavigation
      timeout: 15000
      waitUntil: networkidle0
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'waitForNavigation', timeout: 15000, waitUntil: 'networkidle0' },
    ])
  })

  it('parse un step assertNotPresent', () => {
    const yaml = `
authentication:
  steps:
    - action: assertNotPresent
      selector: ".error-message"
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'assertNotPresent', selector: '.error-message' },
    ])
  })

  it('parse un step wait', () => {
    const yaml = `
authentication:
  steps:
    - action: wait
      duration: 3000
`
    expect(yamlToSteps(yaml)).toEqual([
      { action: 'wait', duration: 3000 },
    ])
  })

  it('retourne null si le YAML est une chaîne vide', () => {
    expect(yamlToSteps('')).toBeNull()
  })
})

// ─── patchYamlSteps ───────────────────────────────────────────────────────────

describe('patchYamlSteps', () => {
  it('remplace les steps existants et préserve le reste du YAML', () => {
    const original = `name: "Mon scénario"
authentication:
  url: "https://example.com/login"
  steps:
    - action: click
      selector: "button"
verification:
  - type: url
    contains: "/dashboard"
    required: true
`
    const newSteps = [{ action: 'click' as const, selector: 'button.new' }]
    const result = patchYamlSteps(original, newSteps)
    expect(yamlToSteps(result)).toEqual(newSteps)
    expect(result).toContain('verification:')
    expect(result).toContain('/dashboard')
  })

  it('fonctionne si authentication.steps était absent', () => {
    const original = `name: "test"\nauthentication:\n  url: "https://example.com"\n`
    const newSteps = [{ action: 'wait' as const, duration: 1000 }]
    const result = patchYamlSteps(original, newSteps)
    expect(yamlToSteps(result)).toEqual(newSteps)
  })

  it('produit un YAML valide avec plusieurs steps', () => {
    const original = `name: "test"\nauthentication:\n  url: "https://x.com"\n  steps: []\n`
    const newSteps = [
      { action: 'fill' as const, selector: 'input', valueEnv: 'LOGIN_VALUE' },
      { action: 'click' as const, selector: 'button' },
    ]
    const result = patchYamlSteps(original, newSteps)
    expect(yamlToSteps(result)).toEqual(newSteps)
  })

  it('préserve le nom du scénario intouché', () => {
    const original = `name: "Preserved Name"\nauthentication:\n  url: "https://x.com"\n  steps: []\n`
    const result = patchYamlSteps(original, [])
    expect(result).toContain('Preserved Name')
  })
})
```

- [ ] **Step 2 : Vérifier que les tests échouent (TDD red)**

```bash
cd packages/app && pnpm exec vitest run src/hooks/useStepSync.test.ts
```

Résultat attendu : erreur `Cannot find module './useStepSync'`.

- [ ] **Step 3 : Créer `packages/app/src/hooks/useStepSync.ts`**

```typescript
import { load, dump } from 'js-yaml'
import { useCallback, useRef, useState } from 'react'
import type { Step } from '../types'

// ─── Pure functions (exported for testing) ────────────────────────────────────

/**
 * Parse a YAML string and extract authentication.steps.
 * Returns null if the YAML is syntactically invalid or empty.
 * Returns [] if authentication.steps is absent.
 */
export function yamlToSteps(yaml: string): Step[] | null {
  if (!yaml.trim()) return null
  try {
    const doc = load(yaml) as Record<string, unknown> | null
    if (!doc || typeof doc !== 'object') return null
    const auth = doc['authentication'] as Record<string, unknown> | undefined
    if (!auth || typeof auth !== 'object') return []
    const steps = auth['steps']
    if (!Array.isArray(steps)) return []
    return steps as Step[]
  } catch {
    return null
  }
}

/**
 * Replace authentication.steps in the existing YAML string.
 * Preserves all other sections (verification, options, name, etc.).
 * Always returns a valid YAML string.
 */
export function patchYamlSteps(yaml: string, steps: Step[]): string {
  try {
    const doc = (load(yaml) as Record<string, unknown> | null) ?? {}
    if (!doc['authentication'] || typeof doc['authentication'] !== 'object') {
      doc['authentication'] = {}
    }
    ;(doc['authentication'] as Record<string, unknown>)['steps'] = steps
    return dump(doc, { lineWidth: -1 })
  } catch {
    return dump({ authentication: { steps } }, { lineWidth: -1 })
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseStepSyncOptions {
  yaml: string
  onYamlChange: (yaml: string) => void
  debounceMs?: number
}

interface UseStepSyncResult {
  steps: Step[]
  onStepsChange: (steps: Step[]) => void
  onYamlEdit: (newYaml: string) => void
  localYaml: string
  yamlError: boolean
}

export function useStepSync({
  yaml,
  onYamlChange,
  debounceMs = 300,
}: UseStepSyncOptions): UseStepSyncResult {
  const [steps, setSteps] = useState<Step[]>(() => yamlToSteps(yaml) ?? [])
  const [localYaml, setLocalYaml] = useState(yaml)
  const [yamlError, setYamlError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastYamlProp = useRef(yaml)
  const localYamlRef = useRef(localYaml)
  localYamlRef.current = localYaml

  // When parent yaml prop changes (scenario switch), reset local state
  if (yaml !== lastYamlProp.current) {
    lastYamlProp.current = yaml
    const parsed = yamlToSteps(yaml)
    setSteps(parsed ?? [])
    setLocalYaml(yaml)
    setYamlError(false)
  }

  // Blocks → YAML: immediate, always valid
  const onStepsChange = useCallback(
    (newSteps: Step[]) => {
      setSteps(newSteps)
      const newYaml = patchYamlSteps(localYamlRef.current, newSteps)
      setLocalYaml(newYaml)
      onYamlChange(newYaml)
    },
    [onYamlChange],
  )

  // YAML → blocks: debounced, blocks unchanged if syntax invalid
  const onYamlEdit = useCallback(
    (newYaml: string) => {
      setLocalYaml(newYaml)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const parsed = yamlToSteps(newYaml)
        if (parsed === null) {
          setYamlError(true)
        } else {
          setYamlError(false)
          setSteps(parsed)
        }
        onYamlChange(newYaml)
      }, debounceMs)
    },
    [onYamlChange, debounceMs],
  )

  return { steps, onStepsChange, onYamlEdit, localYaml, yamlError }
}
```

- [ ] **Step 4 : Lancer les tests (TDD green)**

```bash
cd packages/app && pnpm exec vitest run src/hooks/useStepSync.test.ts
```

Résultat attendu : tous les tests PASS.

- [ ] **Step 5 : Vérifier TypeScript**

```bash
cd packages/app && pnpm exec tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add packages/app/src/hooks/useStepSync.ts packages/app/src/hooks/useStepSync.test.ts
git commit -m "feat(block-editor): add useStepSync pure functions with tests"
```

---

## Task 3 — `StepBlock.tsx` — formulaire par type d'action

**Files:**
- Create: `packages/app/src/components/editor/StepBlock.tsx`

Ce composant reçoit un `Step` et une callback `onChange`. Il rend le formulaire adapté au type d'action. Il n'a aucune connaissance du YAML. Il inclut aussi un bouton de suppression et un drag handle.

- [ ] **Step 1 : Créer `packages/app/src/components/editor/StepBlock.tsx`**

```tsx
import type { CSSProperties } from 'react'
import type {
  Step,
  FillStep,
  WaitForSelectorStep,
  ClickStep,
  WaitForNavigationStep,
  AssertNotPresentStep,
  WaitStep,
  ActionType,
} from '../../types'
import { ACTION_TYPES } from '../../types'

interface Props {
  step: Step
  index: number
  dragHandleProps?: Record<string, unknown>
  onChange: (updated: Step) => void
  onDelete: () => void
}

const inputStyle: CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 12,
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: CSSProperties = {
  fontSize: 11,
  color: '#6b7280',
  marginBottom: 2,
  display: 'block',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function FillForm({ step, onChange }: { step: FillStep; onChange: (s: Step) => void }) {
  return (
    <>
      <Field label="selector">
        <input style={inputStyle} value={step.selector}
          onChange={(e) => onChange({ ...step, selector: e.target.value })}
          placeholder="input[type='email']" />
      </Field>
      <Field label="valueEnv">
        <input style={inputStyle} value={step.valueEnv}
          onChange={(e) => onChange({ ...step, valueEnv: e.target.value })}
          placeholder="LOGIN_VALUE" />
      </Field>
      <Field label="valueType (optionnel)">
        <select style={{ ...inputStyle, background: 'white' }} value={step.valueType ?? ''}
          onChange={(e) => onChange({ ...step, valueType: e.target.value === 'totp' ? 'totp' : undefined })}>
          <option value="">—</option>
          <option value="totp">totp</option>
        </select>
      </Field>
    </>
  )
}

function WaitForSelectorForm({ step, onChange }: { step: WaitForSelectorStep; onChange: (s: Step) => void }) {
  return (
    <>
      <Field label="selector">
        <input style={inputStyle} value={step.selector}
          onChange={(e) => onChange({ ...step, selector: e.target.value })}
          placeholder="input[type='email']" />
      </Field>
      <Field label="timeout (ms, optionnel)">
        <input style={inputStyle} type="number" value={step.timeout ?? ''}
          onChange={(e) => onChange({ ...step, timeout: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="10000" />
      </Field>
      <Field label="errorSelector (optionnel)">
        <input style={inputStyle} value={step.errorSelector ?? ''}
          onChange={(e) => onChange({ ...step, errorSelector: e.target.value || undefined })}
          placeholder=".error-banner" />
      </Field>
    </>
  )
}

function ClickForm({ step, onChange }: { step: ClickStep; onChange: (s: Step) => void }) {
  return (
    <Field label="selector">
      <input style={inputStyle} value={step.selector}
        onChange={(e) => onChange({ ...step, selector: e.target.value })}
        placeholder="button[type='submit']" />
    </Field>
  )
}

function WaitForNavigationForm({ step, onChange }: { step: WaitForNavigationStep; onChange: (s: Step) => void }) {
  return (
    <>
      <Field label="waitUntil (optionnel)">
        <select style={{ ...inputStyle, background: 'white' }} value={step.waitUntil ?? ''}
          onChange={(e) => onChange({ ...step, waitUntil: e.target.value || undefined })}>
          <option value="">—</option>
          <option value="load">load</option>
          <option value="domcontentloaded">domcontentloaded</option>
          <option value="networkidle0">networkidle0</option>
          <option value="networkidle2">networkidle2</option>
        </select>
      </Field>
      <Field label="timeout (ms, optionnel)">
        <input style={inputStyle} type="number" value={step.timeout ?? ''}
          onChange={(e) => onChange({ ...step, timeout: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="15000" />
      </Field>
    </>
  )
}

function AssertNotPresentForm({ step, onChange }: { step: AssertNotPresentStep; onChange: (s: Step) => void }) {
  return (
    <Field label="selector">
      <input style={inputStyle} value={step.selector}
        onChange={(e) => onChange({ ...step, selector: e.target.value })}
        placeholder=".error-message" />
    </Field>
  )
}

function WaitForm({ step, onChange }: { step: WaitStep; onChange: (s: Step) => void }) {
  return (
    <Field label="duration (ms)">
      <input style={inputStyle} type="number" value={step.duration}
        onChange={(e) => onChange({ ...step, duration: Number(e.target.value) })}
        placeholder="3000" />
    </Field>
  )
}

const ACTION_COLORS: Record<ActionType, string> = {
  fill: '#4f46e5',
  waitForSelector: '#059669',
  click: '#d97706',
  waitForNavigation: '#7c3aed',
  assertNotPresent: '#dc2626',
  wait: '#6b7280',
}

function defaultStep(action: ActionType): Step {
  switch (action) {
    case 'fill': return { action: 'fill', selector: '', valueEnv: '' }
    case 'waitForSelector': return { action: 'waitForSelector', selector: '' }
    case 'click': return { action: 'click', selector: '' }
    case 'waitForNavigation': return { action: 'waitForNavigation' }
    case 'assertNotPresent': return { action: 'assertNotPresent', selector: '' }
    case 'wait': return { action: 'wait', duration: 1000 }
  }
}

export default function StepBlock({ step, index, dragHandleProps, onChange, onDelete }: Props) {
  const color = ACTION_COLORS[step.action]

  function renderForm() {
    switch (step.action) {
      case 'fill': return <FillForm step={step} onChange={onChange} />
      case 'waitForSelector': return <WaitForSelectorForm step={step} onChange={onChange} />
      case 'click': return <ClickForm step={step} onChange={onChange} />
      case 'waitForNavigation': return <WaitForNavigationForm step={step} onChange={onChange} />
      case 'assertNotPresent': return <AssertNotPresentForm step={step} onChange={onChange} />
      case 'wait': return <WaitForm step={step} onChange={onChange} />
    }
  }

  return (
    <div style={{
      border: `1px solid ${color}22`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 6,
      padding: 10,
      marginBottom: 8,
      background: 'white',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span {...dragHandleProps}
          style={{ cursor: 'grab', color: '#9ca3af', fontSize: 14, lineHeight: 1, userSelect: 'none' }}
          title="Déplacer">≡</span>
        <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 18 }}>{index + 1}</span>
        <select
          style={{ ...inputStyle, width: 'auto', flex: 1, fontWeight: 600, color, border: `1px solid ${color}44` }}
          value={step.action}
          onChange={(e) => onChange(defaultStep(e.target.value as ActionType))}>
          {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={onDelete}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
          title="Supprimer">×</button>
      </div>
      {renderForm()}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd packages/app && pnpm exec tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add packages/app/src/components/editor/StepBlock.tsx
git commit -m "feat(block-editor): add StepBlock component with per-action forms"
```

---

## Task 4 — `BlockEditor.tsx` — liste drag & drop

**Files:**
- Create: `packages/app/src/components/editor/BlockEditor.tsx`

- [ ] **Step 1 : Créer `packages/app/src/components/editor/BlockEditor.tsx`**

```tsx
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
import type { Step } from '../../types'
import StepBlock from './StepBlock'

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
}

export default function BlockEditor({ steps, onStepsChange }: Props) {
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
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>
        {steps.length} step{steps.length !== 1 ? 's' : ''} — authentication
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
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd packages/app && pnpm exec tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add packages/app/src/components/editor/BlockEditor.tsx
git commit -m "feat(block-editor): add BlockEditor with @dnd-kit/sortable drag & drop"
```

---

## Task 5 — `SplitEditor.tsx` — conteneur split-view

**Files:**
- Create: `packages/app/src/components/editor/SplitEditor.tsx`

**Important :** `YamlEditor` a son propre debounce interne. Depuis `SplitEditor`, passer `debounceMs={0}` pour désactiver ce debounce — `useStepSync` gère déjà le sien. Un double debounce provoquerait un délai de 600ms au lieu de 300ms.

- [ ] **Step 1 : Créer `packages/app/src/components/editor/SplitEditor.tsx`**

```tsx
import BlockEditor from './BlockEditor'
import YamlEditor from './YamlEditor'
import { useStepSync } from '../../hooks/useStepSync'

interface Props {
  value: string
  onChange: (yaml: string) => void
}

export default function SplitEditor({ value, onChange }: Props) {
  const { steps, onStepsChange, onYamlEdit, localYaml, yamlError } = useStepSync({
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
        <BlockEditor steps={steps} onStepsChange={onStepsChange} />
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
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd packages/app && pnpm exec tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add packages/app/src/components/editor/SplitEditor.tsx
git commit -m "feat(block-editor): add SplitEditor split-view container"
```

---

## Task 6 — Brancher `SplitEditor` dans `App.tsx`

**Files:**
- Modify: `packages/app/src/App.tsx`

- [ ] **Step 1 : Modifier `packages/app/src/App.tsx`**

Remplacer uniquement l'import de `YamlEditor` par `SplitEditor`, et l'usage dans le tab `editor` :

```diff
-import YamlEditor from './components/editor/YamlEditor'
+import SplitEditor from './components/editor/SplitEditor'
```

```diff
-                  <YamlEditor value={selected.yaml_content} onChange={update} />
+                  <SplitEditor value={selected.yaml_content} onChange={update} />
```

Changer aussi le label du tab de `'YAML'` en `'Éditeur'` :

```diff
-                    {t === 'editor' ? 'YAML' : 'Runner'}
+                    {t === 'editor' ? 'Éditeur' : 'Runner'}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd packages/app && pnpm exec tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Lancer tous les tests**

```bash
cd packages/app && pnpm exec vitest run
```

Résultat attendu : tous les tests PASS (au minimum les tests `useStepSync`).

- [ ] **Step 4 : Lancer l'app en mode dev et vérifier**

```bash
cd packages/app && pnpm dev
```

Vérifications manuelles :
- Le tab "Éditeur" affiche deux panneaux côte à côte (blocs à gauche, YAML à droite)
- Modifier un champ dans un bloc met à jour le YAML immédiatement
- Modifier le YAML met à jour les blocs après 300ms
- Taper du YAML invalide affiche la bannière rouge et ne modifie pas les blocs
- Le drag & drop réordonne les steps (YAML mis à jour en conséquence)
- Cliquer "+ Ajouter un step" ajoute un step `click` vide
- "×" supprime le step correspondant
- Changer le type d'action bascule le formulaire
- Sélectionner un autre scénario réinitialise blocs et YAML

- [ ] **Step 5 : Commit final**

```bash
git add packages/app/src/App.tsx
git commit -m "feat(block-editor): wire SplitEditor into App — block editor MVP complete"
```

---

## Récapitulatif des fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `packages/app/package.json` | Modifier | Ajouter `@dnd-kit/core` et `@dnd-kit/sortable` |
| `packages/app/src/types.ts` | Modifier | Ajouter le type union `Step` et `ACTION_TYPES` |
| `packages/app/src/hooks/useStepSync.ts` | Créer | Fonctions pures `yamlToSteps` / `patchYamlSteps` + hook bidirectionnel |
| `packages/app/src/hooks/useStepSync.test.ts` | Créer | 13 tests unitaires des fonctions pures (vitest) |
| `packages/app/src/components/editor/StepBlock.tsx` | Créer | Formulaire par type d'action, drag handle, suppression |
| `packages/app/src/components/editor/BlockEditor.tsx` | Créer | Liste sortable `@dnd-kit/sortable`, bouton "Ajouter" |
| `packages/app/src/components/editor/SplitEditor.tsx` | Créer | Conteneur split-view 40/60, câblage `useStepSync` |
| `packages/app/src/App.tsx` | Modifier | Remplacer `YamlEditor` par `SplitEditor` dans le tab éditeur |
