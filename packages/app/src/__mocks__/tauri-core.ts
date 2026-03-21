import type { Scenario } from '../types'

// ─── Mock data ────────────────────────────────────────────────────────────────

const SCENARIO_A: Scenario = {
  id: 'a',
  name: 'Keycloak',
  yaml_content: `name: "Keycloak"
authentication:
  url: "https://auth.example.com/login"
  steps:
    - action: waitForSelector
      selector: "#username"
    - action: fill
      selector: "#username"
      valueEnv: "LOGIN_VALUE"
    - action: click
      selector: "#kc-login"
    - action: waitForNavigation
`,
  created_at: 1,
  updated_at: 1,
}

const SCENARIO_B: Scenario = {
  id: 'b',
  name: 'WordPress',
  yaml_content: `name: "WordPress"
authentication:
  url: "https://wp.example.com/wp-login.php"
  steps:
    - action: fill
      selector: "#user_login"
      valueEnv: "WP_USER"
    - action: fill
      selector: "#user_pass"
      valueEnv: "WP_PASS"
    - action: click
      selector: "#wp-submit"
`,
  created_at: 2,
  updated_at: 2,
}

let scenarios: Scenario[] = [SCENARIO_A, SCENARIO_B]

// ─── @tauri-apps/api/core ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  await new Promise((r) => setTimeout(r, 50))
  switch (cmd) {
    case 'list_scenarios':
      return [...scenarios] as T
    case 'create_scenario': {
      const payload = (args as { payload: { name: string; yaml_content: string } }).payload
      const s: Scenario = { id: Date.now().toString(), created_at: Date.now(), updated_at: Date.now(), ...payload }
      scenarios = [s, ...scenarios]
      return s as T
    }
    case 'update_scenario': {
      const p = (args as { payload: Scenario }).payload
      scenarios = scenarios.map((s) => s.id === p.id ? { ...s, ...p, updated_at: Date.now() } : s)
      return undefined as T
    }
    case 'delete_scenario': {
      const { id } = args as { id: string }
      scenarios = scenarios.filter((s) => s.id !== id)
      return undefined as T
    }
    case 'check_node':
      return 'node mock' as T
    default:
      throw new Error(`Unknown command: ${cmd}`)
  }
}

// ─── @tauri-apps/plugin-dialog ────────────────────────────────────────────────

export async function open(): Promise<string | null> { return null }
export async function save(): Promise<string | null> { return null }

// ─── @tauri-apps/plugin-fs ───────────────────────────────────────────────────

export async function readTextFile(): Promise<string> { return '' }
export async function writeTextFile(): Promise<void> {}

// @tauri-apps/api/event
export function listen(_event: string, _handler: unknown) {
  return Promise.resolve(() => {})
}
