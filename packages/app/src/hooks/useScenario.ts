import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useState } from 'react'
import type { Scenario } from '../types'

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
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    const list = await invoke<Scenario[]>('list_scenarios')
    setScenarios(list)
  }, [])

  useEffect(() => { reload() }, [reload])

  const create = useCallback(async () => {
    const scenario = await invoke<Scenario>('create_scenario', {
      payload: { name: 'Nouveau scénario', yaml_content: DEFAULT_YAML },
    })
    await reload()
    setSelected(scenario)
  }, [reload])

  const update = useCallback(async (yaml_content: string) => {
    if (!selected) return
    await invoke('update_scenario', {
      payload: { id: selected.id, name: selected.name, yaml_content },
    })
    setSelected((s) => s ? { ...s, yaml_content } : s)
  }, [selected])

  const rename = useCallback(async (name: string) => {
    if (!selected) return
    await invoke('update_scenario', {
      payload: { id: selected.id, name, yaml_content: selected.yaml_content },
    })
    setSelected((s) => s ? { ...s, name } : s)
    await reload()
  }, [selected, reload])

  const remove = useCallback(async (id: string) => {
    await invoke('delete_scenario', { id })
    if (selected?.id === id) setSelected(null)
    await reload()
  }, [selected, reload])

  return { scenarios, selected, setSelected, loading, create, update, rename, remove, reload }
}
