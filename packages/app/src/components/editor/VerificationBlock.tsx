import type { CSSProperties } from 'react'
import type {
  Verification,
  CookieVerification,
  LocalStorageVerification,
  UrlVerification,
  SelectorVerification,
  TitleVerification,
  VerificationType,
} from '../../types'
import { VERIFICATION_TYPES } from '../../types'

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

function RequiredField({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <Field label="required">
      <select
        style={{ ...inputStyle, background: 'white' }}
        value={value === false ? 'false' : 'true'}
        onChange={(e) => onChange(e.target.value === 'true')}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    </Field>
  )
}

function CookieForm({ v, onChange }: { v: CookieVerification; onChange: (u: Verification) => void }) {
  return (
    <>
      <Field label="name">
        <input style={inputStyle} value={v.name}
          onChange={(e) => onChange({ ...v, name: e.target.value })}
          placeholder="session_id" />
      </Field>
      <RequiredField value={v.required} onChange={(r) => onChange({ ...v, required: r })} />
    </>
  )
}

function LocalStorageForm({ v, onChange }: { v: LocalStorageVerification; onChange: (u: Verification) => void }) {
  return (
    <>
      <Field label="key">
        <input style={inputStyle} value={v.key}
          onChange={(e) => onChange({ ...v, key: e.target.value })}
          placeholder="auth-token" />
      </Field>
      <RequiredField value={v.required} onChange={(r) => onChange({ ...v, required: r })} />
    </>
  )
}

function UrlForm({ v, onChange }: { v: UrlVerification; onChange: (u: Verification) => void }) {
  return (
    <>
      <Field label="contains">
        <input style={inputStyle} value={v.contains}
          onChange={(e) => onChange({ ...v, contains: e.target.value })}
          placeholder="/dashboard" />
      </Field>
      <RequiredField value={v.required} onChange={(r) => onChange({ ...v, required: r })} />
    </>
  )
}

function SelectorForm({ v, onChange }: { v: SelectorVerification; onChange: (u: Verification) => void }) {
  return (
    <>
      <Field label="selector">
        <input style={inputStyle} value={v.selector}
          onChange={(e) => onChange({ ...v, selector: e.target.value })}
          placeholder=".user-menu" />
      </Field>
      <RequiredField value={v.required} onChange={(r) => onChange({ ...v, required: r })} />
    </>
  )
}

function TitleForm({ v, onChange }: { v: TitleVerification; onChange: (u: Verification) => void }) {
  return (
    <>
      <Field label="contains">
        <input style={inputStyle} value={v.contains}
          onChange={(e) => onChange({ ...v, contains: e.target.value })}
          placeholder="Dashboard" />
      </Field>
      <RequiredField value={v.required} onChange={(r) => onChange({ ...v, required: r })} />
    </>
  )
}

const TYPE_COLORS: Record<VerificationType, string> = {
  cookie: '#0891b2',
  localStorage: '#7c3aed',
  url: '#059669',
  selector: '#d97706',
  title: '#4f46e5',
}

function defaultVerification(type: VerificationType): Verification {
  switch (type) {
    case 'cookie': return { type: 'cookie', name: '', required: true }
    case 'localStorage': return { type: 'localStorage', key: '', required: true }
    case 'url': return { type: 'url', contains: '', required: true }
    case 'selector': return { type: 'selector', selector: '', required: true }
    case 'title': return { type: 'title', contains: '', required: false }
  }
}

interface Props {
  verification: Verification
  index: number
  onChange: (updated: Verification) => void
  onDelete: () => void
}

export default function VerificationBlock({ verification: v, index, onChange, onDelete }: Props) {
  const color = TYPE_COLORS[v.type]

  function renderForm() {
    switch (v.type) {
      case 'cookie': return <CookieForm v={v} onChange={onChange} />
      case 'localStorage': return <LocalStorageForm v={v} onChange={onChange} />
      case 'url': return <UrlForm v={v} onChange={onChange} />
      case 'selector': return <SelectorForm v={v} onChange={onChange} />
      case 'title': return <TitleForm v={v} onChange={onChange} />
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
        <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 18 }}>{index + 1}</span>
        <select
          style={{ ...inputStyle, width: 'auto', flex: 1, fontWeight: 600, color, border: `1px solid ${color}44` }}
          value={v.type}
          onChange={(e) => onChange(defaultVerification(e.target.value as VerificationType))}>
          {VERIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={onDelete}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
          title="Supprimer">×</button>
      </div>
      {renderForm()}
    </div>
  )
}
