import { type ChangeEvent, useState } from 'react'
import { apiUpload } from '../lib/api'
import { input } from './ui'

// Position description input: upload a PDF (text is extracted) or paste the
// full text — both land in the same text box.
export function JobPostingInput({ value, onChange, onCommit, rows = 6 }: {
  value: string
  onChange: (text: string) => void
  onCommit?: (text: string) => void
  rows?: number
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setErr('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await apiUpload('/jd/extract/', fd)
      onChange(r.text); onCommit?.(r.text)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false); e.target.value = '' }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="px-3 py-1.5 text-sm rounded bg-white border border-slate-300 text-slate-700 cursor-pointer hover:bg-slate-50 whitespace-nowrap">
          {busy ? 'Reading PDF…' : 'Upload PDF'}
          <input type="file" accept=".pdf" className="hidden" onChange={onFile} />
        </label>
        <span className="text-xs text-slate-400">Upload a PDF of the posting, or paste the entire text below.</span>
      </div>
      {err && <div className="text-red-600 text-sm mb-1">{err}</div>}
      <textarea className={input} rows={rows} placeholder="Paste the entire position description here…"
        value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onCommit?.(value)} />
    </div>
  )
}
