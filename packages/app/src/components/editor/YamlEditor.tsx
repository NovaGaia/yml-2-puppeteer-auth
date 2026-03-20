import CodeMirror from '@uiw/react-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { useCallback, useEffect, useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  debounceMs?: number
}

export default function YamlEditor({ value, onChange, debounceMs = 300 }: Props) {
  const [local, setLocal] = useState(value)

  // Sync when the prop changes (selecting a different scenario)
  useEffect(() => { setLocal(value) }, [value])

  const handleChange = useCallback((val: string) => {
    setLocal(val)
  }, [])

  // Debounce: call onChange only after debounceMs ms of inactivity
  useEffect(() => {
    if (local === value) return
    const timer = setTimeout(() => onChange(local), debounceMs)
    return () => clearTimeout(timer)
  }, [local, value, onChange, debounceMs])

  return (
    <CodeMirror
      value={local}
      height="100%"
      extensions={[yaml()]}
      onChange={handleChange}
      theme="light"
      style={{ height: '100%', fontSize: 13 }}
    />
  )
}
