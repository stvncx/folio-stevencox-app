import { type ChangeEvent, useState } from 'react'
import { apiPost, apiUpload } from '../lib/api'
import { Button, input } from './ui'

// Position description input: paste a link (fetch), upload a PDF (extract), or
// paste text — all populate the same text box.
export function JobPostingInput({ value, onChange, url, onUrlChange, onCommit, rows = 6 }: {
  value: string
  onChange: (text: string) => void
  url?: string
  onUrlChange?: (url: string) => void
  onCommit?: (text: string, url: string) => void
  rows?: number
}) {
  const [u, setU] = useState(url || '')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  const fetchUrl = async () => {
    if (!u.trim()) return
    setBusy('fetch'); setErr('')
    try {
      const r = await apiPost('/jd/fetch/', { url: u })
      onChange(r.text); onUrlChange?.(u); onCommit?.(r.text, u)
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setBusy('pdf'); setErr('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await apiUpload('/jd/extract/', fd)
      onChange(r.text); onCommit?.(r.text, u)
    } catch (e: any) { setErr(e.message) } finally { setBusy(''); e.target.value = '' }
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input className={input} placeholder="Paste a link to the posting…" value={u}
          onChange={(e) => { setU(e.target.value); onUrlChange?.(e.target.value) }} />
        <Button type="button" variant="outline" onClick={fetchUrl} disabled={busy === 'fetch'}>{busy === 'fetch' ? 'Fetching…' : 'Fetch'}</Button>
        <label className="px-3 py-1.5 text-sm rounded bg-white border border-slate-300 text-slate-700 cursor-pointer hover:bg-slate-50 whitespace-nowrap">
          {busy === 'pdf' ? 'Reading…' : 'Upload PDF'}
          <input type="file" accept=".pdf" className="hidden" onChange={onFile} />
        </label>
      </div>
      <p className="text-xs text-slate-400 mb-2">LinkedIn, Indeed &amp; Glassdoor require sign-in and block auto-fetch — for those, upload the PDF or paste the text.</p>
      {err && <div className="text-red-600 text-sm mb-1">{err}</div>}
      <textarea className={input} rows={rows} placeholder="…or paste the position description text here"
        value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onCommit?.(value, u)} />
    </div>
  )
}
