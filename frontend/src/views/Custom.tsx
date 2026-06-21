import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'
import { useGenerate } from '../lib/generate'
import { SECTION_LABEL, SECTION_TYPES, entryTitle } from '../lib/sections'
import { EntryForm } from '../components/EntryForm'
import { JobPostingInput } from '../components/JobPostingInput'
import { Sortable } from '../components/Sortable'
import { Button, Card, Spinner, confirmAction, input, useToast } from '../components/ui'

export function CustomList() {
  const { id } = useParams(); const tid = Number(id)
  const qc = useQueryClient(); const toast = useToast()
  const { data: t } = useQuery({ queryKey: ['topical', tid], queryFn: () => apiGet(`/topical/${tid}/`) })
  const { data } = useQuery({ queryKey: ['custom', tid], queryFn: () => apiGet(`/topical/${tid}/custom/`) })
  const del = useMutation({ mutationFn: (cid: number) => apiDelete(`/topical/${tid}/custom/${cid}/`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom', tid] }); toast('Deleted') } })
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to={`/topical/${tid}`} className="text-xs text-slate-400">← {t?.title}</Link>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>Custom Resumes</h1>
        </div>
        <Link to={`/topical/${tid}/custom/new`}><Button>+ New</Button></Link>
      </div>
      {!data?.length && <p className="text-slate-500 text-sm">No custom resumes yet.</p>}
      <div className="flex flex-col gap-2">
        {data?.map((c: any) => (
          <Card key={c.id} className="p-4 flex items-center justify-between">
            <div>
              <Link to={`/topical/${tid}/custom/${c.id}`} className="font-semibold hover:underline">{c.title}</Link>
              <p className="text-xs text-slate-500">{[c.company_name, c.position_title].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${c.generation_method === 'copied' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>{c.generation_method === 'copied' ? 'Copied' : 'AI'}</span>
              <Button variant="ghost" onClick={() => { if (confirmAction('Delete this custom resume?')) del.mutate(c.id) }}>Delete</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function CustomNew() {
  const { id } = useParams(); const tid = Number(id)
  const nav = useNavigate(); const toast = useToast()
  const gen = useGenerate()
  const [f, setF] = useState({ title: '', company_name: '', position_title: '', job_posting: '' })
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const { data: existing } = useQuery({ queryKey: ['custom', tid], queryFn: () => apiGet(`/topical/${tid}/custom/`) })
  const [copyId, setCopyId] = useState(''); const [copyTitle, setCopyTitle] = useState('')

  const runAI = async () => {
    if (!f.title || !f.job_posting) return toast('Title and job posting are required', 'error')
    try { const cid = await gen.run(`/topical/${tid}/custom/generate/`, f, '/ws/ai/custom/generate/'); nav(`/topical/${tid}/custom/${cid}`) }
    catch { /* shown */ }
  }
  const copy = useMutation({
    mutationFn: () => copyId === 'topical'
      ? apiPost(`/topical/${tid}/custom/from-topical/`, { title: copyTitle || 'Copy of topical' })
      : apiPost(`/topical/${tid}/custom/${Number(copyId)}/copy/`, { title: copyTitle || 'Copy' }),
    onSuccess: (c: any) => nav(`/topical/${tid}/custom/${c.id}`),
  })

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>New Custom Resume</h1>
      <Card className="p-5 mb-4">
        <h3 className="font-semibold mb-2">Generate with AI</h3>
        <input className={input + ' mb-2'} placeholder="Title (e.g. Acme — Senior Engineer)" value={f.title} onChange={(e) => set('title', e.target.value)} />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input className={input} placeholder="Company" value={f.company_name} onChange={(e) => set('company_name', e.target.value)} />
          <input className={input} placeholder="Position" value={f.position_title} onChange={(e) => set('position_title', e.target.value)} />
        </div>
        <JobPostingInput value={f.job_posting} onChange={(t) => set('job_posting', t)} />
        <div className="mt-3"><Button onClick={runAI} disabled={gen.streaming}>{gen.streaming ? 'Generating…' : 'Generate'}</Button></div>
        {(gen.streaming || gen.preview || gen.error) && (
          <div className="mt-3">
            {gen.streaming && <Spinner label="Tailoring resume…" />}
            {gen.error && <div className="text-red-600 text-sm">{gen.error}</div>}
            <pre className="text-xs text-slate-500 whitespace-pre-wrap max-h-48 overflow-auto mt-2">{gen.preview}</pre>
          </div>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-2">Copy from a source (no AI)</h3>
        <p className="text-sm text-slate-500 mb-2">Start from your curated topical resume, or duplicate an existing custom resume — then edit it manually.</p>
        <select className={input + ' mb-2'} value={copyId} onChange={(e) => setCopyId(e.target.value)}>
          <option value="">Select a source…</option>
          <option value="topical">This topical resume (curated content)</option>
          {existing?.map((c: any) => <option key={c.id} value={c.id}>Copy of: {c.title}</option>)}
        </select>
        <input className={input + ' mb-2'} placeholder="New title" value={copyTitle} onChange={(e) => setCopyTitle(e.target.value)} />
        <Button variant="outline" disabled={!copyId || copy.isPending} onClick={() => copy.mutate()}>Create</Button>
      </Card>
    </div>
  )
}

export function CustomEditor() {
  const { id, cid } = useParams(); const tid = Number(id); const cidN = Number(cid)
  const qc = useQueryClient(); const toast = useToast()
  const { data: c, isLoading } = useQuery({ queryKey: ['customDetail', cidN], queryFn: () => apiGet(`/topical/${tid}/custom/${cidN}/`) })
  const [modal, setModal] = useState<null | { sid: number; sectionType: string; entry: any }>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['customDetail', cidN] })

  const addSection = useMutation({
    mutationFn: (st: string) => apiPost(`/custom/${cidN}/sections/`, { section_type: st, title: SECTION_LABEL[st] || st, order: 999 }),
    onSuccess: () => { refresh(); toast('Section added') },
  })
  const delSection = useMutation({ mutationFn: (sid: number) => apiDelete(`/custom/${cidN}/sections/${sid}/`), onSuccess: () => { refresh(); toast('Section removed') } })
  const saveEntry = useMutation({
    mutationFn: (p: { sid: number; entry?: any; data: any }) =>
      p.entry
        ? apiPatch(`/custom/${cidN}/sections/${p.sid}/entries/${p.entry.id}/`, { data: p.data, order: p.entry.order })
        : apiPost(`/custom/${cidN}/sections/${p.sid}/entries/`, { data: p.data, order: 999 }),
    onSuccess: () => { refresh(); setModal(null); toast('Saved') },
    onError: (e: any) => toast(e.message, 'error'),
  })
  const delEntry = useMutation({ mutationFn: (p: { sid: number; eid: number }) => apiDelete(`/custom/${cidN}/sections/${p.sid}/entries/${p.eid}/`), onSuccess: () => { refresh(); toast('Deleted') } })
  const saveTitle = useMutation({ mutationFn: (title: string) => apiPatch(`/topical/${tid}/custom/${cidN}/`, { title }), onSuccess: refresh })

  if (isLoading) return <div className="p-8"><Spinner label="Loading…" /></div>
  const sById: Record<number, any> = Object.fromEntries(c.sections.map((s: any) => [s.id, s]))

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3 no-print">
        <label className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Name</span>
          <input className="text-xl font-bold bg-white border border-slate-200 rounded px-2 py-0.5 hover:border-slate-300 focus:border-slate-400 focus:outline-none"
            style={{ color: 'var(--color-primary)' }} defaultValue={c.title} title="Click to rename"
            onBlur={(e) => { if (e.target.value.trim() && e.target.value !== c.title) saveTitle.mutate(e.target.value.trim()) }} />
        </label>
        <div className="flex gap-2">
          <Link to={`/topical/${tid}/custom/${cidN}/preview`}><Button variant="outline">Preview</Button></Link>
          <Link to={`/topical/${tid}/custom`}><Button variant="ghost">Back</Button></Link>
        </div>
      </div>
      <div className="flex gap-4">
        <Card className="w-52 shrink-0 p-3 h-fit no-print">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Add section</div>
          {SECTION_TYPES.map((s) => (
            <button key={s.value} disabled={addSection.isPending} onClick={() => addSection.mutate(s.value)}
              className="block w-full text-left text-sm px-2 py-1.5 rounded hover:bg-slate-100">{s.label}</button>
          ))}
        </Card>
        <div className="flex-1 min-w-0">
          {c.sections.length === 0 && <p className="text-slate-500 text-sm">This resume is empty. Add a section from the left.</p>}
          <Sortable ids={c.sections.map((s: any) => s.id)} onReorder={(ids) => apiPost(`/custom/${cidN}/sections/reorder/`, { ordered_ids: ids }).then(refresh)}>
            {(sid) => {
              const s = sById[sid]
              return (
                <Card className="p-4 mb-1">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold" style={{ color: 'var(--color-primary)' }}>{s.title}</h2>
                    <div className="flex gap-1 no-print">
                      <Button variant="outline" onClick={() => setModal({ sid: s.id, sectionType: s.section_type, entry: null })}>+ Entry</Button>
                      <Button variant="ghost" onClick={() => { if (confirmAction('Delete this section and its entries?')) delSection.mutate(s.id) }}>Delete</Button>
                    </div>
                  </div>
                  {s.entries.length === 0
                    ? <p className="text-slate-400 text-sm">No entries.</p>
                    : <Sortable ids={s.entries.map((e: any) => e.id)} onReorder={(ids) => apiPost(`/custom/${cidN}/sections/${s.id}/entries/reorder/`, { ordered_ids: ids }).then(refresh)}>
                      {(eid) => {
                        const e = s.entries.find((x: any) => x.id === eid)
                        return (
                          <div className="flex items-center justify-between border border-slate-100 rounded px-3 py-2 text-sm">
                            <span className="truncate">{entryTitle(s.section_type, e.data)}</span>
                            <div className="flex gap-1 shrink-0 no-print">
                              <Button variant="ghost" onClick={() => setModal({ sid: s.id, sectionType: s.section_type, entry: e })}>Edit</Button>
                              <Button variant="ghost" onClick={() => delEntry.mutate({ sid: s.id, eid: e.id })}>×</Button>
                            </div>
                          </div>
                        )
                      }}
                    </Sortable>}
                </Card>
              )
            }}
          </Sortable>
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-40 no-print" onClick={() => setModal(null)}>
          <Card className="w-full max-w-2xl max-h-[88vh] overflow-auto p-5"><div onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">{modal.entry ? 'Edit' : 'New'} {SECTION_LABEL[modal.sectionType] || modal.sectionType} entry</h3>
            <EntryForm sectionType={modal.sectionType} initial={modal.entry?.data} saving={saveEntry.isPending}
              onCancel={() => setModal(null)} onSave={(data) => saveEntry.mutate({ sid: modal.sid, entry: modal.entry, data })} />
          </div></Card>
        </div>
      )}
    </div>
  )
}
