import { useState } from 'react'
import { FIELDS, toMonthYear } from '../lib/sections'
import { BulletEditor, RichEditor } from './Editor'
import { ExperienceEntryForm } from './ExperienceEntryForm'
import { Button, Field, input } from './ui'

export function EntryForm({ sectionType, initial, onSave, onCancel, saving }: {
  sectionType: string
  initial?: Record<string, any>
  onSave: (data: Record<string, any>) => void
  onCancel: () => void
  saving?: boolean
}) {
  if (sectionType === 'experience') {
    return <ExperienceEntryForm initial={initial} onSave={onSave} onCancel={onCancel} saving={saving} />
  }
  const fields = FIELDS[sectionType] || []
  const [data, setData] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = initial ? { ...initial } : {}
    // Checkboxes only land in state when toggled; seed them to false so an
    // untouched box is still sent (an unchecked box is a valid `false`).
    for (const f of fields) if (f.type === 'checkbox' && init[f.key] === undefined) init[f.key] = false
    // Show dates as MM-YYYY (convert any legacy YYYY-MM values).
    for (const f of fields) if (f.type === 'monthyear' && init[f.key]) init[f.key] = toMonthYear(init[f.key])
    // Migrate a legacy single `description` into the `descriptions` pool.
    if (init.description && init.descriptions === undefined && fields.some((f) => f.key === 'descriptions')) {
      init.descriptions = [init.description]
      delete init.description
    }
    return init
  })
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
          // NOT a <label> — wrapping a contentEditable in a label steals focus.
          <div key={f.key} className="mb-3">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{f.label}{f.required ? ' *' : ''}</span>
            <RichEditor value={v || ''} onChange={(html) => set(f.key, html)} />
          </div>
        )
        if (f.type === 'richlist') {
          const list: string[] = Array.isArray(v) ? v : []
          return (
            <div key={f.key} className="mb-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{f.label}</span>
              {list.map((html, i) => (
                <div key={i} className="mb-2 border border-slate-200 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Description {i + 1}</span>
                    <Button variant="ghost" type="button" onClick={() => set(f.key, list.filter((_, j) => j !== i))}>Remove</Button>
                  </div>
                  <RichEditor value={html} onChange={(h) => set(f.key, list.map((x, j) => (j === i ? h : x)))} />
                </div>
              ))}
              <Button variant="outline" type="button" onClick={() => set(f.key, [...list, ''])}>+ Add description</Button>
            </div>
          )
        }
        if (f.type === 'textarea') return (
          <Field key={f.key} label={f.label}>
            <textarea className={input} rows={3} value={v || ''} onChange={(e) => set(f.key, e.target.value)} />
          </Field>
        )
        if (f.type === 'bullets') return (
          <Field key={f.key} label={f.label}>
            {bullets.map((b, i) => (
              <div key={i} className="flex gap-2 mb-1 items-start">
                <BulletEditor value={b} onChange={(h) => set('bullets', bullets.map((x, j) => j === i ? h : x))} />
                <Button variant="ghost" type="button" onClick={() => set('bullets', bullets.filter((_, j) => j !== i))}>×</Button>
              </div>
            ))}
            <Button variant="outline" type="button" onClick={() => set('bullets', [...bullets, ''])}>+ Add bullet</Button>
          </Field>
        )
        return (
          <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
            <input className={input} type="text"
              placeholder={f.type === 'monthyear' ? 'MM-YYYY' : undefined}
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
