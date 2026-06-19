import { useEffect, useState } from 'react'
import { apiPatch, apiUpload, apiDelete } from '../lib/api'
import { useTheme } from '../lib/theme'
import { Button, Card, useToast } from '../components/ui'

export function ThemeSettings() {
  const { theme, apply, reload } = useTheme()
  const toast = useToast()
  const [primary, setPrimary] = useState(theme.primary_color)
  const [accent, setAccent] = useState(theme.accent_color)

  useEffect(() => { setPrimary(theme.primary_color); setAccent(theme.accent_color) }, [theme.primary_color, theme.accent_color])

  const onPrimary = (v: string) => { setPrimary(v); apply({ primary_color: v }) }
  const onAccent = (v: string) => { setAccent(v); apply({ accent_color: v }) }

  const save = async () => { await apiPatch('/profile/', { primary_color: primary, accent_color: accent }); reload(); toast('Theme saved') }
  const onFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file)
    try { await apiUpload('/profile/font/', fd); reload(); toast('Font uploaded') }
    catch (err: any) { toast(err.message, 'error') }
  }
  const removeFont = async () => { await apiDelete('/profile/font/'); reload(); toast('Font removed') }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Theme</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Colors</h3>
          <label className="flex items-center justify-between mb-3 text-sm">Primary
            <input type="color" value={primary} onChange={(e) => onPrimary(e.target.value)} />
          </label>
          <label className="flex items-center justify-between mb-4 text-sm">Accent
            <input type="color" value={accent} onChange={(e) => onAccent(e.target.value)} />
          </label>
          <h3 className="font-semibold mb-2">Font</h3>
          <p className="text-xs text-slate-500 mb-2">Current: {theme.font_name || 'system default'}</p>
          <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={onFont} className="text-sm mb-2 block" />
          {theme.font_name && <Button variant="ghost" onClick={removeFont}>Remove font</Button>}
          <div className="mt-4"><Button onClick={save}>Save theme</Button></div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Live preview</h3>
          <div className="border border-slate-200 rounded p-4">
            <div className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>Jane Candidate</div>
            <div className="text-sm" style={{ color: 'var(--color-accent)' }}>Senior Software Engineer</div>
            <p className="text-sm text-slate-600 mt-2">Experienced engineer with a track record of shipping reliable systems…</p>
            <div className="mt-3 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>Experience</div>
            <p className="text-sm text-slate-600">Acme Corp — Senior Engineer (2021–Present)</p>
          </div>
          <p className="text-xs text-slate-400 mt-2">Theme applies to the app and to exported resumes.</p>
        </Card>
      </div>
    </div>
  )
}
