import { useState } from 'react'
import { BulletEditor, RichEditor } from './Editor'
import { emptyPosition, normalizeExperience, type Position } from '../lib/sections'
import { Button, Field, input } from './ui'

// Editor for one company group: the company name + one or more positions
// (roles) held there, each with its own dates, description pool, and bullets.
export function ExperienceEntryForm({ initial, onSave, onCancel, saving }: {
  initial?: Record<string, any>
  onSave: (data: any) => void
  onCancel: () => void
  saving?: boolean
}) {
  const norm = normalizeExperience(initial)
  const [company, setCompany] = useState(norm.company)
  const [positions, setPositions] = useState<Position[]>(norm.positions.length ? norm.positions : [emptyPosition()])
  const [error, setError] = useState('')

  const setPos = (i: number, patch: Partial<Position>) =>
    setPositions((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  const submit = () => {
    if (!company.trim()) { setError('Company is required.'); return }
    for (const p of positions) if (!p.job_title.trim()) { setError('Each position needs a job title.'); return }
    setError('')
    onSave({ company: company.trim(), positions })
  }

  return (
    <div>
      <Field label="Company *">
        <input className={input} value={company} onChange={(e) => setCompany(e.target.value)} />
      </Field>

      {positions.map((p, i) => (
        <div key={i} className="border border-slate-200 rounded p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Position {i + 1}</span>
            {positions.length > 1 && <Button variant="ghost" type="button" onClick={() => setPositions((ps) => ps.filter((_, j) => j !== i))}>Remove position</Button>}
          </div>
          <Field label="Job title *"><input className={input} value={p.job_title} onChange={(e) => setPos(i, { job_title: e.target.value })} /></Field>
          <Field label="Location"><input className={input} value={p.location || ''} onChange={(e) => setPos(i, { location: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start (MM-YYYY)"><input className={input} placeholder="MM-YYYY" value={p.start_date || ''} onChange={(e) => setPos(i, { start_date: e.target.value })} /></Field>
            {!p.is_current && <Field label="End (MM-YYYY)"><input className={input} placeholder="MM-YYYY" value={p.end_date || ''} onChange={(e) => setPos(i, { end_date: e.target.value })} /></Field>}
          </div>
          <label className="flex items-center gap-2 mb-3 text-sm">
            <input type="checkbox" checked={!!p.is_current} onChange={(e) => setPos(i, { is_current: e.target.checked })} /> I currently work here
          </label>

          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Descriptions (alternatives — pick one per resume)</span>
          {(p.descriptions || []).map((html, di) => (
            <div key={di} className="mb-2 border border-slate-200 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Description {di + 1}</span>
                <Button variant="ghost" type="button" onClick={() => setPos(i, { descriptions: (p.descriptions || []).filter((_, j) => j !== di) })}>Remove</Button>
              </div>
              <RichEditor value={html} onChange={(h) => setPos(i, { descriptions: (p.descriptions || []).map((x, j) => (j === di ? h : x)) })} />
            </div>
          ))}
          <Button variant="outline" type="button" className="mb-3" onClick={() => setPos(i, { descriptions: [...(p.descriptions || []), ''] })}>+ Add description</Button>

          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Bullets (selectable per resume)</span>
          {(p.bullets || []).map((b, bi) => (
            <div key={bi} className="flex gap-2 mb-1 items-start">
              <BulletEditor value={b} onChange={(h) => setPos(i, { bullets: (p.bullets || []).map((x, j) => (j === bi ? h : x)) })} />
              <Button variant="ghost" type="button" onClick={() => setPos(i, { bullets: (p.bullets || []).filter((_, j) => j !== bi) })}>×</Button>
            </div>
          ))}
          <Button variant="outline" type="button" onClick={() => setPos(i, { bullets: [...(p.bullets || []), ''] })}>+ Add bullet</Button>
        </div>
      ))}

      <Button variant="outline" type="button" onClick={() => setPositions((ps) => [...ps, emptyPosition()])}>+ Add another position at this company</Button>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      <div className="flex gap-2 mt-3">
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
