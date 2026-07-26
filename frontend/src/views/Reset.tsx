import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiPost } from '../lib/api'
import { Button, Card, input } from '../components/ui'

export function Reset() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return }
    if (pw !== pw2) { setErr('Passwords do not match.'); return }
    setBusy(true)
    try {
      const r = await apiPost('/auth/reset-password/', { token, new_password: pw })
      setOk(r.detail || 'Password reset.')
      setTimeout(() => nav('/login'), 1600)
    } catch (e: any) {
      setErr(e.message || 'Could not reset password.')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-full grid place-items-center p-6">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-primary)' }}>Reset password</h1>
        {!token && <p className="text-red-600 text-sm mt-2">This reset link is missing its token. Request a new one from the sign-in page.</p>}
        {ok ? (
          <p className="text-sm mt-2" style={{ color: 'var(--color-accent)' }}>{ok} Redirecting to sign in…</p>
        ) : token && (
          <form onSubmit={submit} className="mt-3">
            {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
            <input className={input + ' mb-3'} type="password" placeholder="New password (min 8 chars)" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            <input className={input + ' mb-3'} type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <Button className="w-full justify-center" disabled={busy}>{busy ? 'Resetting…' : 'Set new password'}</Button>
          </form>
        )}
      </Card>
    </div>
  )
}
