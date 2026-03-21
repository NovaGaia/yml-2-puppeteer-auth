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
