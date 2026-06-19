import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiGet } from './api'
import { useAuth } from './auth'

export interface Theme {
  primary_color: string
  accent_color: string
  font_name: string
  font_url: string | null
}

interface ThemeState {
  theme: Theme
  apply: (t: Partial<Theme>) => void
  reload: () => void
}

const DEFAULT: Theme = { primary_color: '#000000', accent_color: '#0066cc', font_name: '', font_url: null }
const Ctx = createContext<ThemeState>(null as never)
export const useTheme = () => useContext(Ctx)

function injectVars(t: Theme) {
  const root = document.documentElement
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
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [theme, setTheme] = useState<Theme>(DEFAULT)

  const reload = useCallback(() => {
    if (!token) return
    apiGet('/profile/').then((p) => {
      const t = { primary_color: p.primary_color, accent_color: p.accent_color, font_name: p.font_name, font_url: p.font_url }
      setTheme(t); injectVars(t)
    }).catch(() => {})
  }, [token])

  useEffect(() => { reload() }, [reload])

  const apply = (patch: Partial<Theme>) => {
    setTheme((prev) => { const next = { ...prev, ...patch }; injectVars(next); return next })
  }

  return <Ctx.Provider value={{ theme, apply, reload }}>{children}</Ctx.Provider>
}
