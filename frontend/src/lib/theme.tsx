import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiGet, apiPatch } from './api'
import { useAuth } from './auth'

// Chrome accent per site-wide preset (owner-set in the Django admin).
const ACCENT_PRESETS: Record<string, string> = { verdigris: '#17604f', ember: '#e0a34b', slate: '#2b4bbf' }

// In dark mode, lighten the accent so it stays readable on the dark chrome.
function accentForTheme(hex: string, dark: boolean): string {
  if (!dark) return hex
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '')
  if (!m) return hex
  const int = parseInt(m[1], 16)
  let r = ((int >> 16) & 255) / 255, g = ((int >> 8) & 255) / 255, b = (int & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const l = (max + min) / 2
  let h = 0, s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  const nl = Math.max(l, 0.62), ns = Math.min(s, 0.85)
  const c = (1 - Math.abs(2 * nl - 1)) * ns
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const off = nl - c / 2
  let rr = 0, gg = 0, bb = 0
  if (h < 60) { rr = c; gg = x } else if (h < 120) { rr = x; gg = c }
  else if (h < 180) { gg = c; bb = x } else if (h < 240) { gg = x; bb = c }
  else if (h < 300) { rr = x; bb = c } else { rr = c; bb = x }
  const to = (v: number) => Math.round((v + off) * 255).toString(16).padStart(2, '0')
  return `#${to(rr)}${to(gg)}${to(bb)}`
}

export interface Theme {
  primary_color: string
  accent_color: string
  font_name: string
  font_url: string | null
  mode: 'light' | 'dark'
  site_preset: string
}

interface ThemeState {
  theme: Theme
  apply: (t: Partial<Theme>) => void
  reload: () => void
  setMode: (m: 'light' | 'dark') => void
}

const DEFAULT: Theme = { primary_color: '#000000', accent_color: '#0066cc', font_name: '', font_url: null, mode: 'light', site_preset: 'verdigris' }
const Ctx = createContext<ThemeState>(null as never)
export const useTheme = () => useContext(Ctx)

function injectVars(t: Theme) {
  const root = document.documentElement
  // Per-user document branding.
  root.style.setProperty('--color-primary', t.primary_color)
  root.style.setProperty('--color-accent', t.accent_color)
  if (t.font_url && t.font_name) {
    const id = 'folio-user-font'
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el) }
    el.textContent = `@font-face{font-family:'UserFont';src:url('${t.font_url}');}`
    root.style.setProperty('--font-family-custom', `'UserFont', ui-sans-serif, system-ui, sans-serif`)
  } else {
    root.style.removeProperty('--font-family-custom')
  }
  // Chrome: mode (per user) + accent (site preset).
  const dark = t.mode === 'dark'
  root.dataset.theme = dark ? 'dark' : 'light'
  root.style.setProperty('--c-accent', accentForTheme(ACCENT_PRESETS[t.site_preset] || ACCENT_PRESETS.verdigris, dark))
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [theme, setTheme] = useState<Theme>(() => {
    const m = localStorage.getItem('folio_mode')
    const next: Theme = { ...DEFAULT, mode: m === 'dark' ? 'dark' : 'light' }
    injectVars(next)
    return next
  })

  const reload = useCallback(() => {
    if (!token) return
    apiGet('/profile/').then((p) => {
      const t: Theme = {
        primary_color: p.primary_color, accent_color: p.accent_color, font_name: p.font_name, font_url: p.font_url,
        mode: p.mode === 'dark' ? 'dark' : 'light', site_preset: p.site_preset || 'verdigris',
      }
      localStorage.setItem('folio_mode', t.mode)
      setTheme(t); injectVars(t)
    }).catch(() => {})
  }, [token])

  useEffect(() => { reload() }, [reload])

  const apply = (patch: Partial<Theme>) => {
    setTheme((prev) => { const next = { ...prev, ...patch }; injectVars(next); return next })
  }
  const setMode = (mode: 'light' | 'dark') => {
    localStorage.setItem('folio_mode', mode)
    apply({ mode })
    apiPatch('/profile/', { mode }).catch(() => {})
  }

  return <Ctx.Provider value={{ theme, apply, reload, setMode }}>{children}</Ctx.Provider>
}
