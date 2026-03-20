interface Props {
  valueEnvs: string[]
  credentials: Record<string, string>
  onChange: (key: string, value: string) => void
}

function isSecret(name: string): boolean {
  return name.includes('PASS') || name.includes('SECRET') || name.includes('TOKEN')
}

function isTotpField(name: string): boolean {
  return name.includes('TOTP') || name.includes('SECRET')
}

export default function CredentialsForm({ valueEnvs, credentials, onChange }: Props) {
  if (valueEnvs.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <strong style={{ fontSize: 13 }}>Credentials :</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        {valueEnvs.map((key) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ width: 160, fontSize: 13, fontFamily: 'monospace', flexShrink: 0 }}>
              {key}
              {isTotpField(key) && (
                <span style={{ color: '#888', marginLeft: 4 }}>(totp)</span>
              )}
            </label>
            <input
              type={isSecret(key) ? 'password' : 'text'}
              value={credentials[key] ?? ''}
              onChange={(e) => onChange(key, e.target.value)}
              style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
              placeholder={isSecret(key) ? '••••••••' : 'valeur'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
