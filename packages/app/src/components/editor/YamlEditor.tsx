import CodeMirror from '@uiw/react-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { useCallback, useEffect, useRef, useState } from 'react'

const YAML_EXTENSIONS = [yaml()]

interface Props {
  value: string
  onChange: (value: string) => void
  debounceMs?: number
}

export default function YamlEditor({ value, onChange, debounceMs = 300 }: Props) {
  const [local, setLocal] = useState(value)
  const isExternalUpdate = useRef(false)

  // Sync when the prop changes (selecting a different scenario)
  useEffect(() => {
    isExternalUpdate.current = true
    setLocal(value)
  }, [value])

  const handleChange = useCallback((val: string) => {
    setLocal(val)
  }, [])

  // Debounce: call onChange only after debounceMs ms of user inactivity
  // Do NOT fire when local changed because of an external value update
  useEffect(() => {
    if (local === value) return
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false
      return
    }
    const timer = setTimeout(() => onChange(local), debounceMs)
    return () => clearTimeout(timer)
  }, [local, value, onChange, debounceMs])

  return (
    <CodeMirror
      value={local}
      height="100%"
      extensions={YAML_EXTENSIONS}
      onChange={handleChange}
      theme="light"
      style={{ height: '100%', fontSize: 13 }}
    />
  )
}
