import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'
import { useGenerate } from '../lib/generate'
import { RichEditor } from '../components/Editor'
import { Button, Card, Spinner, input, useToast } from '../components/ui'

const STATUSES = ['saved', 'applied', 'phone_screen', 'interview', 'offer', 'rejected', 'withdrawn']
const STATUS_LABEL: Record<string, string> = {
  saved: 'Saved', applied: 'Applied', phone_screen: 'Phone Screen', interview: 'Interview',
  offer: 'Offer', rejected: 'Rejected', withdrawn: 'Withdrawn',
}

// Flatten every custom resume across all topicals (for linking + cover letters).
function useAllCustoms() {
  return useQuery({
    queryKey: ['allCustoms'],
    queryFn: async () => {
      const topicals = await apiGet('/topical/')
      const out: { id: number; title: string }[] = []
      for (const t of topicals) {
        const cs = await apiGet(`/topical/${t.id}/custom/`)
        for (const c of cs) out.push({ id: c.id, title: `${t.title} — ${c.title}` })
      }
      return out
    },
  })
}

export function ApplicationsList() {
  const { data } = useQuery({ queryKey: ['apps'], queryFn: () => apiGet('/applications/') })
  const [filter, setFilter] = useState('all')
  const rows = (data || []).filter((a: any) => filter === 'all' || a.status === filter)
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>Applications</h1>
        <Link to="/applications/new"><Button>+ Add</Button></Link>
      </div>
      <div className="flex gap-1 mb-3 flex-wrap">
        {['all', ...STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-2.5 py-1 rounded-full border ${filter === s ? 'text-white' : 'bg-white border-slate-300 text-slate-600'}`}
            style={filter === s ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)' } : undefined}>
            {s === 'all' ? 'All' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
            <th className="px-4 py-2">Company</th><th className="px-4 py-2">Position</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Applied</th>
          </tr></thead>
          <tbody>
            {rows.map((a: any) => (
              <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                <td className="px-4 py-2"><Link to={`/applications/${a.id}`} className="font-medium hover:underline">{a.company_name}</Link></td>
                <td className="px-4 py-2">{a.position_title}</td>
                <td className="px-4 py-2">{STATUS_LABEL[a.status]}</td>
                <td className="px-4 py-2 text-slate-500">{a.applied_date || '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No applications. Add one to start tracking.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function ApplicationNew() {
  const nav = useNavigate()
  const [f, setF] = useState({ company_name: '', position_title: '', status: 'saved', job_posting: '' })
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))
  const create = useMutation({ mutationFn: () => apiPost('/applications/', f), onSuccess: (a: any) => nav(`/applications/${a.id}`) })
  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>New Application</h1>
      <Card className="p-5">
        <input className={input + ' mb-2'} placeholder="Company" value={f.company_name} onChange={(e) => set('company_name', e.target.value)} />
        <input className={input + ' mb-2'} placeholder="Position" value={f.position_title} onChange={(e) => set('position_title', e.target.value)} />
        <select className={input + ' mb-2'} value={f.status} onChange={(e) => set('status', e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <textarea className={input + ' mb-3'} rows={4} placeholder="Job posting (optional)" value={f.job_posting} onChange={(e) => set('job_posting', e.target.value)} />
        <Button disabled={!f.company_name || !f.position_title || create.isPending} onClick={() => create.mutate()}>Create</Button>
      </Card>
    </div>
  )
}

export function ApplicationDetail() {
  const { id } = useParams(); const aid = Number(id)
  const qc = useQueryClient(); const toast = useToast()
  const { data: a, isLoading } = useQuery({ queryKey: ['app', aid], queryFn: () => apiGet(`/applications/${aid}/`) })
  const { data: customs } = useAllCustoms()
  const [tab, setTab] = useState<'overview' | 'cover' | 'contacts' | 'activity'>('overview')
  const refresh = () => qc.invalidateQueries({ queryKey: ['app', aid] })
  const patch = useMutation({ mutationFn: (body: any) => apiPatch(`/applications/${aid}/`, body), onSuccess: () => { refresh(); toast('Saved') } })

  if (isLoading) return <div className="p-8"><Spinner label="Loading…" /></div>

  return (
    <div className="p-6 max-w-3xl">
      <Link to="/applications" className="text-xs text-slate-400">← Applications</Link>
      <h1 className="text-xl font-bold mt-1 mb-1" style={{ color: 'var(--color-primary)' }}>{a.position_title}</h1>
      <p className="text-slate-500 mb-4">{a.company_name}</p>
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(['overview', 'cover', 'contacts', 'activity'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm border-b-2 ${tab === t ? 'border-current font-medium' : 'border-transparent text-slate-500'}`} style={tab === t ? { color: 'var(--color-accent)' } : undefined}>
            {t === 'cover' ? 'Cover Letter' : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <Card className="p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">Status
              <select className={input} value={a.status} onChange={(e) => patch.mutate({ status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="text-sm">Applied date
              <input type="date" className={input} defaultValue={a.applied_date || ''} onBlur={(e) => patch.mutate({ applied_date: e.target.value || null })} />
            </label>
            <label className="text-sm">Linked custom resume
              <select className={input} value={a.custom_resume_id || ''} onChange={(e) => patch.mutate({ custom_resume_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— none —</option>
                {customs?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
            <label className="text-sm">Follow-up date
              <input type="date" className={input} defaultValue={a.follow_up_date || ''} onBlur={(e) => patch.mutate({ follow_up_date: e.target.value || null })} />
            </label>
          </div>
          <label className="text-sm block mt-3">Notes
            <textarea className={input} rows={4} defaultValue={a.notes} onBlur={(e) => patch.mutate({ notes: e.target.value })} />
          </label>
        </Card>
      )}

      {tab === 'cover' && <CoverLetterTab app={a} refresh={refresh} />}
      {tab === 'contacts' && <ContactsTab aid={aid} contacts={a.contacts} refresh={refresh} />}
      {tab === 'activity' && <ActivityTab aid={aid} activities={a.activities} refresh={refresh} />}
    </div>
  )
}

function CoverLetterTab({ app, refresh }: { app: any; refresh: () => void }) {
  const toast = useToast(); const gen = useGenerate()
  const [html, setHtml] = useState(app.cover_letter || '')
  const save = useMutation({ mutationFn: () => apiPatch(`/applications/${app.id}/cover-letter/`, { cover_letter: html }), onSuccess: () => { refresh(); toast('Saved') } })
  const run = async () => {
    if (!app.custom_resume_id) return toast('Link a custom resume first (Overview tab).', 'error')
    try {
      await gen.run(`/applications/${app.id}/cover-letter/generate/`, { custom_resume_id: app.custom_resume_id }, '/ws/ai/cover-letter/generate/')
      const fresh = await apiGet(`/applications/${app.id}/`)
      setHtml(fresh.cover_letter); refresh()
    } catch { /* shown */ }
  }
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Cover Letter</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={run} disabled={gen.streaming}>{gen.streaming ? 'Generating…' : 'Generate with AI'}</Button>
          <Button onClick={() => save.mutate()}>Save</Button>
        </div>
      </div>
      {gen.error && <div className="text-red-600 text-sm mb-2">{gen.error}</div>}
      {gen.streaming
        ? <pre className="text-xs text-slate-500 whitespace-pre-wrap max-h-64 overflow-auto border rounded p-3">{gen.preview}</pre>
        : <RichEditor value={html} onChange={setHtml} />}
    </Card>
  )
}

function ContactsTab({ aid, contacts, refresh }: { aid: number; contacts: any[]; refresh: () => void }) {
  const [f, setF] = useState({ name: '', role: 'recruiter', email: '', phone: '', title: '', linkedin_url: '', notes: '' })
  const add = useMutation({ mutationFn: () => apiPost(`/applications/${aid}/contacts/`, f), onSuccess: () => { refresh(); setF({ name: '', role: 'recruiter', email: '', phone: '', title: '', linkedin_url: '', notes: '' }) } })
  const del = useMutation({ mutationFn: (cid: number) => apiDelete(`/applications/${aid}/contacts/${cid}/`), onSuccess: refresh })
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-2 mb-4">
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center justify-between border border-slate-100 rounded px-3 py-2 text-sm">
            <span>{c.name} <span className="text-slate-400">· {c.role}{c.email ? ` · ${c.email}` : ''}</span></span>
            <Button variant="ghost" onClick={() => del.mutate(c.id)}>×</Button>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-slate-400 text-sm">No contacts.</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className={input} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          <option value="recruiter">Recruiter</option><option value="hiring_manager">Hiring Manager</option><option value="other">Other</option>
        </select>
        <input className={input} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={input} placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </div>
      <Button className="mt-2" disabled={!f.name} onClick={() => add.mutate()}>Add contact</Button>
    </Card>
  )
}

function ActivityTab({ aid, activities, refresh }: { aid: number; activities: any[]; refresh: () => void }) {
  const [f, setF] = useState({ activity_type: 'note', title: '', notes: '' })
  const add = useMutation({
    mutationFn: () => apiPost(`/applications/${aid}/activities/`, { ...f, date: new Date().toISOString() }),
    onSuccess: () => { refresh(); setF({ activity_type: 'note', title: '', notes: '' }) },
  })
  const del = useMutation({ mutationFn: (id: number) => apiDelete(`/applications/${aid}/activities/${id}/`), onSuccess: refresh })
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-2 mb-4">
        {activities.map((x) => (
          <div key={x.id} className="flex items-center justify-between border-l-2 border-slate-200 pl-3 py-1 text-sm">
            <span><span className="text-slate-400 text-xs">{new Date(x.date).toLocaleString()} · {x.activity_type}</span><br />{x.title}</span>
            <Button variant="ghost" onClick={() => del.mutate(x.id)}>×</Button>
          </div>
        ))}
        {activities.length === 0 && <p className="text-slate-400 text-sm">No activity logged.</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={f.activity_type} onChange={(e) => setF({ ...f, activity_type: e.target.value })}>
          {['note', 'email_sent', 'email_received', 'phone_call', 'interview', 'follow_up', 'offer_received', 'other'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className={input} placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>
      <textarea className={input + ' mt-2'} rows={2} placeholder="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      <Button className="mt-2" disabled={!f.title} onClick={() => add.mutate()}>Log activity</Button>
    </Card>
  )
}
