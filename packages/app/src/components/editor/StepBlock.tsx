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
