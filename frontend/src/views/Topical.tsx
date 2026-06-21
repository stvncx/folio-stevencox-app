import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'
import { useGenerate } from '../lib/generate'
import { dateRange, entryTitle, normalizeExperience, positionLocation } from '../lib/sections'
import { EntryForm } from '../components/EntryForm'
import { Sortable } from '../components/Sortable'
import { Button, Card, Spinner, confirmAction, input, useToast } from '../components/ui'

// Normalise an experience entry's data into pool + selection (defaults: first
// description, all bullets) so it can be mixed-and-matched per resume.
function prepExperience(data: any) {
  const exp = normalizeExperience(data)
  return {
    company: exp.company,
    location: exp.location,
    use_company_location: exp.use_company_location,
    positions: exp.positions.map((p) => ({
      ...p,
      selected_description: (p.descriptions && p.descriptions.length) ? (p.selected_description ?? 0) : null,
      selected_bullets: p.selected_bullets ?? (p.bullets || []).map((_, i) => i),
    })),
  }
}

// Per-resume selection for one experience job: choose one description, check
// which bullets to include. Saves silently (no refetch) for snappy toggling.
function ExperienceSelection({ entry, save }: { entry: any; save: (data: any) => void }) {
  const [data, setData] = useState<any>(() => prepExperience(entry.data))
  const positions: any[] = data.positions || []
  const setPos = (i: number, patch: any) => {
    const nd = { ...data, positions: positions.map((p, j) => (j === i ? { ...p, ...patch } : p)) }
    setData(nd); save(nd)
  }
  return (
    <div className="text-sm">
      <div className="font-semibold">{data.company || '(company)'}</div>
      {positions.map((p, i) => {
        const descriptions: string[] = p.descriptions || []
        const bullets: string[] = p.bullets || []
        const selDesc: number | null = p.selected_description ?? (descriptions.length ? 0 : null)
        const selBullets: number[] = p.selected_bullets ?? bullets.map((_: string, k: number) => k)
        return (
          <div key={i} className="mt-2 pl-3 border-l-2 border-slate-200">
            <div className="font-medium">{p.job_title || '(role)'}
              {dateRange(p) && <span className="text-xs text-slate-400"> · {dateRange(p)}</span>}
              {positionLocation(data, p) && <span className="text-xs text-slate-400"> · {positionLocation(data, p)}</span>}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-1 mb-1">Description (choose one)</div>
            {descriptions.length === 0 && <p className="text-xs text-slate-400">No descriptions — add alternatives in the CV.</p>}
            {descriptions.map((html, di) => (
              <label key={di} className="flex gap-2 items-start mb-1 cursor-pointer">
                <input type="radio" className="mt-1" checked={selDesc === di} onChange={() => setPos(i, { selected_description: di })} />
                <span className="text-slate-700" dangerouslySetInnerHTML={{ __html: html || '<em>(empty)</em>' }} />
              </label>
            ))}
            {bullets.length > 0 && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-1 mb-1">Bullets (select any)</div>
                {bullets.map((b, bi) => (
                  <label key={bi} className="flex gap-2 items-start mb-1 cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={selBullets.includes(bi)}
                      onChange={(e) => setPos(i, { selected_bullets: e.target.checked ? [...selBullets, bi].sort((x, y) => x - y) : selBullets.filter((x) => x !== bi) })} />
                    <span className="text-slate-700" dangerouslySetInnerHTML={{ __html: (b || '').replace(/<\/?p>/g, '') }} />
                  </label>
                ))}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CustomLinks({ tid }: { tid: number }) {
  const { data } = useQuery({ queryKey: ['custom', tid], queryFn: () => apiGet(`/topical/${tid}/custom/`) })
  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Custom resumes</div>
      {data && data.length === 0 && <p className="text-xs text-slate-400">None yet.</p>}
      {data?.map((c: any) => (
        <Link key={c.id} to={`/topical/${tid}/custom/${c.id}`} className="flex items-center justify-between text-sm py-0.5 hover:underline">
          <span className="truncate">{c.title}</span>
          <span className="text-xs text-slate-400 shrink-0 ml-2">{c.generation_method === 'copied' ? 'copied' : 'AI'}</span>
        </Link>
      ))}
      <Link to={`/topical/${tid}/custom/new`} className="inline-block text-xs mt-1" style={{ color: 'var(--color-accent)' }}>+ New custom resume</Link>
    </div>
  )
}

export function TopicalList() {
  const qc = useQueryClient(); const toast = useToast()
  const { data } = useQuery({ queryKey: ['topical'], queryFn: () => apiGet('/topical/') })
  const del = useMutation({ mutationFn: (id: number) => apiDelete(`/topical/${id}/`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['topical'] }); toast('Deleted') } })
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>Topical Resumes</h1>
        <Link to="/topical/new"><Button>+ New</Button></Link>
      </div>
      {!data?.length && <p className="text-slate-500 text-sm">No topical resumes yet. Create one curated around a job type.</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        {data?.map((t: any) => (
          <Card key={t.id} className="p-4">
            <Link to={`/topical/${t.id}`} className="font-semibold hover:underline">{t.title}</Link>
            <p className="text-sm text-slate-500 line-clamp-2 mt-1">{t.description}</p>
            <CustomLinks tid={t.id} />
            <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
              <span>{new Date(t.created_at).toLocaleDateString()}</span>
              <div className="flex gap-1">
                <Link to={`/topical/${t.id}`}><Button variant="ghost">Edit</Button></Link>
                <Link to={`/topical/${t.id}/preview`}><Button variant="ghost">Preview</Button></Link>
                <Button variant="ghost" onClick={() => { if (confirmAction('Delete this topical resume and all its custom resumes?')) del.mutate(t.id) }}>Delete</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function TopicalNew() {
  const nav = useNavigate(); const toast = useToast()
  const [title, setTitle] = useState(''); const [desc, setDesc] = useState('')
  const gen = useGenerate()
  const manual = useMutation({
    mutationFn: () => apiPost('/topical/', { title, description: desc }),
    onSuccess: (t: any) => nav(`/topical/${t.id}`),
  })
  const runAI = async () => {
    if (!title) return toast('Enter a title', 'error')
    try { const id = await gen.run('/topical/generate/', { title, description: desc }, '/ws/ai/topical/generate/'); nav(`/topical/${id}`) }
    catch { /* error shown */ }
  }
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>New Topical Resume</h1>
      <Card className="p-5 mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Title</label>
        <input className={input + ' mb-3'} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Technology" />
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Target job type description</label>
        <textarea className={input} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the kind of roles this resume targets…" />
      </Card>
      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <h3 className="font-semibold mb-1">Manual</h3>
          <p className="text-sm text-slate-500 mb-3">Start empty and pick sections & entries from your CV yourself.</p>
          <Button variant="outline" onClick={() => manual.mutate()} disabled={!title || manual.isPending}>Create empty</Button>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-1">Let AI build it</h3>
          <p className="text-sm text-slate-500 mb-3">AI curates the most relevant CV content for the described job type.</p>
          <Button onClick={runAI} disabled={gen.streaming}>{gen.streaming ? 'Generating…' : 'Generate with AI'}</Button>
        </Card>
      </div>
      {(gen.streaming || gen.preview || gen.error) && (
        <Card className="p-4 mt-4">
          {gen.streaming && <Spinner label="Generating…" />}
          {gen.error && <div className="text-red-600 text-sm">{gen.error}</div>}
          <pre className="text-xs text-slate-500 whitespace-pre-wrap max-h-48 overflow-auto mt-2">{gen.preview}</pre>
        </Card>
      )}
    </div>
  )
}

export function TopicalEditor() {
  const { id } = useParams(); const tid = Number(id)
  const qc = useQueryClient(); const toast = useToast()
  const { data: t, isLoading } = useQuery({ queryKey: ['topical', tid], queryFn: () => apiGet(`/topical/${tid}/`) })
  const { data: cv } = useQuery({ queryKey: ['cv'], queryFn: () => apiGet('/cv/') })
  const [modal, setModal] = useState<null | { sectionId: number; sectionType: string; entry: any }>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['topical', tid] })

  const ensureSection = async (sectionType: string, title: string) => {
    const existing = t.sections.find((s: any) => s.section_type === sectionType)
    if (existing) return existing
    const s = await apiPost(`/topical/${tid}/sections/`, { section_type: sectionType, title, is_active: true, order: 999 })
    return s
  }
  const addFromCV = useMutation({
    mutationFn: async (e: { cvEntry: any; sectionType: string; sectionTitle: string }) => {
      const sec = await ensureSection(e.sectionType, e.sectionTitle)
      const data = e.sectionType === 'experience' ? prepExperience(e.cvEntry.data) : e.cvEntry.data
      return apiPost(`/topical/${tid}/sections/${sec.id}/entries/`, { cv_entry_id: e.cvEntry.id, data, order: 999 })
    },
    onSuccess: () => { refresh(); toast('Added') },
  })
  const toggleSection = useMutation({
    mutationFn: (p: { sid: number; active: boolean }) => apiPatch(`/topical/${tid}/sections/${p.sid}/`, { is_active: p.active }),
    onSuccess: refresh,
  })
  const delSection = useMutation({ mutationFn: (sid: number) => apiDelete(`/topical/${tid}/sections/${sid}/`), onSuccess: refresh })
  const delEntry = useMutation({ mutationFn: (p: { sid: number; eid: number }) => apiDelete(`/topical/${tid}/sections/${p.sid}/entries/${p.eid}/`), onSuccess: () => { refresh(); toast('Removed') } })
  const saveEntry = useMutation({
    mutationFn: (p: { sid: number; eid: number; data: any }) => apiPatch(`/topical/${tid}/sections/${p.sid}/entries/${p.eid}/`, { data: p.data }),
    onSuccess: () => { refresh(); setModal(null); toast('Saved') },
  })

  if (isLoading) return <div className="p-8"><Spinner label="Loading…" /></div>
  const sById: Record<number, any> = Object.fromEntries(t.sections.map((s: any) => [s.id, s]))

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>{t.title}</h1>
          <p className="text-sm text-slate-500">{t.description}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/topical/${tid}/preview`}><Button variant="outline">Preview</Button></Link>
          <Link to={`/topical/${tid}/custom`}><Button variant="outline">Custom resumes →</Button></Link>
        </div>
      </div>
      <div className="flex gap-4">
        {/* left: CV picker */}
        <Card className="w-72 shrink-0 p-3 h-fit max-h-[80vh] overflow-auto">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Add from CV</div>
          {!cv?.exists && <p className="text-sm text-slate-400">No CV yet.</p>}
          {cv?.sections?.map((s: any) => (
            <div key={s.id} className="mb-2">
              <div className="text-sm font-medium">{s.title}</div>
              {s.entries.map((e: any) => (
                <button key={e.id} className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-slate-100 text-slate-600"
                  onClick={() => addFromCV.mutate({ cvEntry: e, sectionType: s.section_type, sectionTitle: s.title })}>
                  + {entryTitle(s.section_type, e.data)}
                </button>
              ))}
            </div>
          ))}
        </Card>
        {/* right: current topical */}
        <div className="flex-1 min-w-0">
          {t.sections.length === 0 && <p className="text-slate-500 text-sm">Add entries from your CV on the left.</p>}
          <Sortable ids={t.sections.map((s: any) => s.id)} onReorder={(ids) => apiPost(`/topical/${tid}/sections/reorder/`, { ordered_ids: ids }).then(refresh)}>
            {(sid) => {
              const s = sById[sid]
              return (
                <Card className={`p-4 mb-1 ${s.is_active ? '' : 'opacity-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 font-semibold">
                      <input type="checkbox" checked={s.is_active} onChange={(e) => toggleSection.mutate({ sid: s.id, active: e.target.checked })} />
                      {s.title}
                    </label>
                    <Button variant="ghost" onClick={() => { if (confirmAction('Remove this section?')) delSection.mutate(s.id) }}>Delete</Button>
                  </div>
                  {s.entries.map((e: any) => (
                    <div key={e.id} className="border border-slate-100 rounded px-3 py-2 mb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {s.section_type === 'experience'
                            ? <ExperienceSelection entry={e} save={(data) => apiPatch(`/topical/${tid}/sections/${s.id}/entries/${e.id}/`, { data })} />
                            : <span className="text-sm truncate">{entryTitle(s.section_type, e.data)}</span>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {s.section_type !== 'experience' &&
                            <Button variant="ghost" onClick={() => setModal({ sectionId: s.id, sectionType: s.section_type, entry: e })}>Edit</Button>}
                          <Button variant="ghost" onClick={() => delEntry.mutate({ sid: s.id, eid: e.id })}>×</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              )
            }}
          </Sortable>
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-40" onClick={() => setModal(null)}>
          <Card className="w-full max-w-2xl max-h-[88vh] overflow-auto p-5"><div onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">Edit entry</h3>
            <EntryForm sectionType={modal.sectionType} initial={modal.entry.data} saving={saveEntry.isPending}
              onCancel={() => setModal(null)} onSave={(data) => saveEntry.mutate({ sid: modal.sectionId, eid: modal.entry.id, data })} />
          </div></Card>
        </div>
      )}
    </div>
  )
}
