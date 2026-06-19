import { useState } from 'react'
import { FIELDS } from '../lib/sections'
import { RichEditor } from './Editor'
import { Button, Field, input } from './ui'

export function EntryForm({ sectionType, initial, onSave, onCancel, saving }: {
  sectionType: string
  initial?: Record<string, any>
  onSave: (data: Record<string, any>) => void
  onCancel: () => void
  saving?: boolean
}) {
  const fields = FIELDS[sectionType] || []
  const [data, setData] = useState<Record<string, any>>(initial ? { ...initial } : {})
  const set = (k: string, v: any) => setData((d) => ({ ...d, [k]: v }))
  const isCurrent = !!data.is_current
  const [error, setError] = useState('')

  const submit = () => {
    for (const f of fields) {
      if (!f.required || f.type === 'checkbox') continue
      const v = data[f.key]
      if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
        setError(`${f.label} is required.`); return
      }
    }
    setError('')
    onSave(data)
  }

  const bullets: string[] = Array.isArray(data.bullets) ? data.bullets : []

  return (
    <div>
      {fields.map((f) => {
        if (f.key === 'end_date' && isCurrent) return null
        const v = data[f.key]
        if (f.type === 'checkbox') return (
          <label key={f.key} className="flex items-center gap-2 mb-3 text-sm">
            <input type="checkbox" checked={!!v} onChange={(e) => set(f.key, e.target.checked)} />
            {f.label}
          </label>
        )
        if (f.type === 'rich') return (
          <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
            <RichEditor value={v || ''} onChange={(html) => set(f.key, html)} />
          </Field>
        )
        if (f.type === 'textarea') return (
          <Field key={f.key} label={f.label}>
            <textarea className={input} rows={3} value={v || ''} onChange={(e) => set(f.key, e.target.value)} />
          </Field>
        )
        if (f.type === 'bullets') return (
          <Field key={f.key} label={f.label}>
            {bullets.map((b, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input className={input} value={b}
                  onChange={(e) => set('bullets', bullets.map((x, j) => j === i ? e.target.value : x))} />
                <Button variant="ghost" type="button" onClick={() => set('bullets', bullets.filter((_, j) => j !== i))}>×</Button>
              </div>
            ))}
            <Button variant="outline" type="button" onClick={() => set('bullets', [...bullets, ''])}>+ Add bullet</Button>
          </Field>
        )
        return (
          <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
            <input className={input} type={f.type === 'month' ? 'month' : 'text'}
              value={v || ''} onChange={(e) => set(f.key, e.target.value)} />
          </Field>
        )
      })}
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <div className="flex gap-2 mt-2">
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
