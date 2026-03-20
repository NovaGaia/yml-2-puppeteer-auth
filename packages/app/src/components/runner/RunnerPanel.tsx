import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Scenario } from '../../types'
import CredentialsForm from './CredentialsForm'

interface Props {
  scenario: Scenario
}

function extractValueEnvs(yaml: string): string[] {
  const matches = yaml.matchAll(/valueEnv:\s*["']?(\w+)["']?/g)
  const keys = new Set<string>()
  for (const m of matches) keys.add(m[1])
  return Array.from(keys)
}

export default function RunnerPanel({ scenario }: Props) {
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [headed, setHeaded] = useState(true)
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<boolean | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const valueEnvs = extractValueEnvs(scenario.yaml_content)
  const allFilled = valueEnvs.every((k) => credentials[k]?.trim())

  useEffect(() => {
    setCredentials({})
    setLogs([])
    setResult(null)
  }, [scenario.id])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }))
  }

  const handleRun = useCallback(async () => {
    setRunning(true)
    setLogs([])
    setResult(null)

    const unlisten = await listen<string>('runner-log', (event) => {
      setLogs((prev) => [...prev, event.payload])
    })

    try {
      const success = await invoke<boolean>('run_scenario', {
        payload: {
          yaml_content: scenario.yaml_content,
          credentials,
          headed,
        },
      })
      setResult(success)
    } catch (err) {
      setLogs((prev) => [...prev, `Erreur : ${err}`])
      setResult(false)
    } finally {
      unlisten()
      setRunning(false)
    }
  }, [scenario.yaml_content, credentials, headed])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <CredentialsForm
        valueEnvs={valueEnvs}
        credentials={credentials}
        onChange={handleCredentialChange}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="radio" checked={!headed} onChange={() => setHeaded(false)} />
          Headless
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="radio" checked={headed} onChange={() => setHeaded(true)} />
          Headful
        </label>

        <button
          onClick={handleRun}
          disabled={running || !allFilled}
          style={{
            marginLeft: 'auto',
            padding: '6px 16px',
            background: running || !allFilled ? '#ccc' : '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: running || !allFilled ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? '⏳ En cours…' : '▶ Lancer'}
        </button>
      </div>

      {result !== null && (
        <div style={{
          padding: '6px 12px',
          marginBottom: 8,
          borderRadius: 6,
          background: result ? '#d1fae5' : '#fee2e2',
          color: result ? '#065f46' : '#991b1b',
          fontWeight: 600,
        }}>
          {result ? '✓ Authentification réussie' : '✗ Échec'}
        </div>
      )}

      <div style={{
        flex: 1,
        background: '#1e1e1e',
        color: '#d4d4d4',
        borderRadius: 6,
        padding: 12,
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: 13,
        whiteSpace: 'pre-wrap',
      }}>
        {logs.map((line, i) => (
          <div key={i} style={{ color: line.startsWith('[err]') ? '#f87171' : '#d4d4d4' }}>
            {line}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}
