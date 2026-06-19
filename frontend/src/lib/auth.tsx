import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiPost, getToken, setToken } from './api'

interface AuthState {
  token: string | null
  user: { username: string; email: string; is_staff?: boolean } | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthState>(null as never)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(getToken())
  const [user, setUser] = useState<AuthState['user']>(null)

  useEffect(() => {
    const stored = localStorage.getItem('folio_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const login = async (username: string, password: string) => {
    const data = await apiPost('/auth/login/', { username, password })
    setToken(data.token)
    setTok(data.token)
    const u = { username: data.username, email: data.email, is_staff: data.is_staff }
    localStorage.setItem('folio_user', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    apiPost('/auth/logout/').catch(() => {})
    setToken(null)
    localStorage.removeItem('folio_user')
    setTok(null)
    setUser(null)
  }

  return <Ctx.Provider value={{ token, user, login, logout }}>{children}</Ctx.Provider>
}
