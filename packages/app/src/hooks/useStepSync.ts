import { load, dump } from 'js-yaml'
import { useCallback, useEffect, useRef, useState } from 'react'
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

/**
 * Extract authentication.url from a YAML string.
 * Returns '' if absent or invalid.
 */
export function yamlToUrl(yaml: string): string {
  if (!yaml.trim()) return ''
  try {
    const doc = load(yaml) as Record<string, unknown> | null
    if (!doc || typeof doc !== 'object') return ''
    const auth = doc['authentication'] as Record<string, unknown> | undefined
    if (!auth || typeof auth !== 'object') return ''
    return typeof auth['url'] === 'string' ? auth['url'] : ''
  } catch {
    return ''
  }
}

/**
 * Replace authentication.url in the existing YAML string.
 * Preserves all other sections.
 */
export function patchYamlUrl(yaml: string, url: string): string {
  try {
    const doc = (load(yaml) as Record<string, unknown> | null) ?? {}
    if (!doc['authentication'] || typeof doc['authentication'] !== 'object') {
      doc['authentication'] = {}
    }
    ;(doc['authentication'] as Record<string, unknown>)['url'] = url
    return dump(doc, { lineWidth: -1 })
  } catch {
    return dump({ authentication: { url } }, { lineWidth: -1 })
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
  url: string
  onUrlChange: (url: string) => void
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
  const [url, setUrl] = useState(() => yamlToUrl(yaml))
  const [localYaml, setLocalYaml] = useState(yaml)
  const [yamlError, setYamlError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localYamlRef = useRef(localYaml)
  localYamlRef.current = localYaml

  // When parent yaml prop changes (scenario switch), reset local state
  useEffect(() => {
    const parsed = yamlToSteps(yaml)
    setSteps(parsed ?? [])
    setUrl(yamlToUrl(yaml))
    setLocalYaml(yaml)
    setYamlError(false)
  }, [yaml])

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

  const onUrlChange = useCallback(
    (newUrl: string) => {
      setUrl(newUrl)
      const newYaml = patchYamlUrl(localYamlRef.current, newUrl)
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
          setUrl(yamlToUrl(newYaml))
        }
        onYamlChange(newYaml)
      }, debounceMs)
    },
    [onYamlChange, debounceMs],
  )

  return { steps, onStepsChange, url, onUrlChange, onYamlEdit, localYaml, yamlError }
}
