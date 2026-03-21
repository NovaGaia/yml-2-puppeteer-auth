import { invoke } from '@tauri-apps/api/core'
import { load, dump } from 'js-yaml'
import { useCallback, useEffect, useState } from 'react'
import type { Scenario } from '../types'

function patchYamlName(yaml: string, name: string): string {
  try {
    const doc = (load(yaml) as Record<string, unknown> | null) ?? {}
    doc['name'] = name
    return dump(doc, { lineWidth: -1 })
  } catch {
    return yaml
  }
}

const DEFAULT_YAML = `name: "Nouveau scénario"

authentication:
  url: "https://example.com/login"
  steps:
    - action: waitForSelector
      selector: "input[type='email']"
    - action: fill
      selector: "input[type='email']"
      valueEnv: "LOGIN_VALUE"
    - action: fill
      selector: "input[type='password']"
      valueEnv: "PASS_VALUE"
    - action: click
      selector: "button[type='submit']"
    - action: waitForNavigation

verification:
  - type: url
    contains: "/dashboard"
    required: true
`

export function useScenario() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selected, setSelected] = useState<Scenario | null>(null)

  const reload = useCallback(async () => {
    const list = await invoke<Scenario[]>('list_scenarios')
    setScenarios(list)
  }, [])

  useEffect(() => { reload() }, [reload])

  const create = useCallback(async () => {
    const scenario = await invoke<Scenario>('create_scenario', {
      payload: { name: 'Nouveau scénario', yaml_content: DEFAULT_YAML },
    })
    setScenarios((prev) => [scenario, ...prev])
    setSelected(scenario)
  }, [])

  const patch = useCallback(async (changes: Partial<Pick<Scenario, 'name' | 'yaml_content'>>) => {
    if (!selected) return
    const updated = { ...selected, ...changes }
    await invoke('update_scenario', {
      payload: { id: selected.id, name: updated.name, yaml_content: updated.yaml_content },
    })
    setSelected(updated)
    setScenarios((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...changes } : s))
  }, [selected])

  const update = useCallback((yaml_content: string) => patch({ yaml_content }), [patch])

  const rename = useCallback(async (id: string, name: string) => {
    const scenario = scenarios.find((s) => s.id === id)
    if (!scenario) return
    const yaml_content = patchYamlName(scenario.yaml_content, name)
    const updated = { ...scenario, name, yaml_content }
    await invoke('update_scenario', {
      payload: { id, name, yaml_content },
    })
    if (selected?.id === id) setSelected(updated)
    setScenarios((prev) => prev.map((s) => s.id === id ? updated : s))
  }, [scenarios, selected])

  const remove = useCallback(async (id: string) => {
    await invoke('delete_scenario', { id })
    if (selected?.id === id) setSelected(null)
    setScenarios((prev) => prev.filter((s) => s.id !== id))
  }, [selected])

  return { scenarios, selected, setSelected, create, update, rename, remove, reload }
}
