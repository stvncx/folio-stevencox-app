import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button } from './ui'

export function Layout() {
  const { user, logout } = useAuth()
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
        <NavLink to="/settings/theme" className={link}>Theme</NavLink>
        {user?.is_staff && (
          <a href="/admin/" className="px-3 py-1.5 rounded text-sm font-medium text-slate-600 hover:bg-slate-50">Admin</a>
        )}
        <div className="flex-1" />
        <span className="text-xs text-slate-400 mr-2">{user?.username}</span>
        <Button variant="outline" onClick={() => { logout(); nav('/login') }}>Log out</Button>
      </nav>
      <main className="flex-1"><Outlet /></main>
    </div>
  )
}
