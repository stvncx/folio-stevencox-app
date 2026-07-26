import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { Button } from './ui'
import { HelpButton } from './Help'

export function Layout() {
  const { user, logout } = useAuth()
  const { theme, setMode } = useTheme()
  const nav = useNavigate()
  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded text-sm font-medium ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`
  return (
    <div className="min-h-full flex flex-col">
      <nav className="no-print flex items-center gap-1 px-5 h-14 border-b border-slate-200 bg-white">
        <Link to="/cv" className="font-bold text-lg mr-4" style={{ color: 'var(--color-primary)' }}>Folio</Link>
        <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
        <NavLink to="/cv" className={link}>CV</NavLink>
        <NavLink to="/topical" className={link}>Resumes</NavLink>
        <NavLink to="/applications" className={link}>Applications</NavLink>
        {user?.is_staff && (
          <a href="/admin/" className="px-3 py-1.5 rounded text-sm font-medium text-slate-600 hover:bg-slate-50">Admin</a>
        )}
        <div className="flex-1" />
        <button onClick={() => setMode(theme.mode === 'dark' ? 'light' : 'dark')}
          title={theme.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle light/dark mode"
          className="px-2 py-1.5 rounded text-slate-500 hover:bg-slate-100">
          {theme.mode === 'dark'
            ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
        </button>
        <HelpButton />
        <span className="text-xs text-slate-400 mx-2">{user?.username}</span>
        <Button variant="outline" onClick={() => { logout(); nav('/login') }}>Log out</Button>
      </nav>
      <main className="flex-1"><Outlet /></main>
    </div>
  )
}
