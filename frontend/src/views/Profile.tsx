import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch, apiPost } from '../lib/api'
import { Button, Card, Spinner, input, useToast } from '../components/ui'

type QA = { question: string; answer: string }

export function Profile() {
  const qc = useQueryClient(); const toast = useToast()
  const { data: p, isLoading } = useQuery({ queryKey: ['profile'], queryFn: () => apiGet('/profile/') })
  const [about, setAbout] = useState('')
  const [preferences, setPreferences] = useState('')
  const [fulfilling, setFulfilling] = useState('')
  const [personality, setPersonality] = useState<QA[]>([])
  const [gen, setGen] = useState(false)
  const [curPw, setCurPw] = useState(''); const [newPw, setNewPw] = useState(''); const [newPw2, setNewPw2] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const changePw = async () => {
    if (newPw.length < 8) { toast('New password must be at least 8 characters.', 'error'); return }
    if (newPw !== newPw2) { toast('New passwords do not match.', 'error'); return }
    setPwBusy(true)
    try {
      await apiPost('/auth/change-password/', { current_password: curPw, new_password: newPw })
      toast('Password changed'); setCurPw(''); setNewPw(''); setNewPw2('')
    } catch (e: any) { toast(e.message || 'Could not change password', 'error') } finally { setPwBusy(false) }
  }

  useEffect(() => {
    if (!p) return
    setAbout(p.about || ''); setPreferences(p.preferences || ''); setFulfilling(p.fulfilling || '')
    setPersonality(p.personality || [])
  }, [p])

  const save = useMutation({
    mutationFn: () => apiPatch('/profile/', { about, preferences, fulfilling, personality }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); toast('Profile saved') },
  })

  const generate = async () => {
    setGen(true)
    try {
      const r = await apiPost('/profile/personality-questions/')
      const prev = Object.fromEntries(personality.map((x) => [x.question, x.answer]))
      setPersonality(r.questions.map((q: string) => ({ question: q, answer: prev[q] || '' })))
      toast('Questions generated — answer and save')
    } catch (e: any) { toast(e.message, 'error') } finally { setGen(false) }
  }

  if (isLoading) return <div className="p-8"><Spinner label="Loading…" /></div>

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-primary)' }}>My Profile</h1>
      <p className="text-sm text-slate-500 mb-4">Used to assess how well a job or company fits you — e.g. the “AI analysis” on an application.</p>

      <Card className="p-5 mb-4">
        <label className="text-sm block mb-3">About me
          <textarea className={input} rows={4} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Background, strengths, what you're looking for…" />
        </label>
        <label className="text-sm block mb-3">Job preferences
          <textarea className={input} rows={3} value={preferences} onChange={(e) => setPreferences(e.target.value)} placeholder="Remote/hybrid, company size, industry, comp, location…" />
        </label>
        <label className="text-sm block">What I find fulfilling
          <textarea className={input} rows={3} value={fulfilling} onChange={(e) => setFulfilling(e.target.value)} placeholder="The kind of work and impact that energizes you…" />
        </label>
      </Card>

      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold" style={{ color: 'var(--color-primary)' }}>Personality &amp; fit questions</h2>
          <Button variant="outline" onClick={generate} disabled={gen}>{gen ? 'Generating…' : personality.length ? 'Regenerate' : 'Generate questions'}</Button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Up to 10 AI-generated questions. Answer them to sharpen fit assessments. Regenerating keeps answers to questions that remain.</p>
        {personality.length === 0 && <p className="text-sm text-slate-400">No questions yet — click “Generate questions”.</p>}
        {personality.map((q, i) => (
          <div key={i} className="mb-3">
            <div className="text-sm font-medium mb-1">{i + 1}. {q.question}</div>
            <textarea className={input} rows={2} value={q.answer}
              onChange={(e) => setPersonality((s) => s.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
          </div>
        ))}
      </Card>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save profile'}</Button>

      <Card className="p-5 mt-6">
        <h2 className="font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>Change password</h2>
        <label className="text-sm block mb-3">Current password
          <input className={input} type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} autoComplete="current-password" />
        </label>
        <label className="text-sm block mb-3">New password
          <input className={input} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
        </label>
        <label className="text-sm block mb-4">Confirm new password
          <input className={input} type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} autoComplete="new-password" />
        </label>
        <Button variant="outline" onClick={changePw} disabled={pwBusy || !curPw || !newPw}>{pwBusy ? 'Changing…' : 'Change password'}</Button>
      </Card>
    </div>
  )
}
