import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button, Card, input } from '../components/ui'

export function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await login(u, p); nav('/cv') }
    catch { setErr('Invalid email or password.') }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-full grid place-items-center p-6">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-primary)' }}>Folio</h1>
        <p className="text-slate-500 text-sm mb-4">Sign in to manage your career documents.</p>
        {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
        <form onSubmit={submit}>
          <input className={input + ' mb-3'} placeholder="Email or username" value={u} onChange={(e) => setU(e.target.value)} autoFocus />
          <input className={input + ' mb-3'} type="password" placeholder="Password" value={p} onChange={(e) => setP(e.target.value)} />
          <Button className="w-full justify-center" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="text-xs text-slate-400 mt-3">Access is invite-only. Contact the site owner for an account.</p>
      </Card>
    </div>
  )
}
