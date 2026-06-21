import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import { Card, Spinner } from '../components/ui'

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export function Dashboard() {
  const { data: d, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => apiGet('/dashboard/') })
  if (isLoading) return <div className="p-8"><Spinner label="Loading…" /></div>
  const statusEntries = Object.entries(d.by_status || {})
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Job Search Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <div className="text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>{d.total}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total applications</div>
        </Card>
        {statusEntries.map(([k, v]) => (
          <Card key={k} className="p-4">
            <div className="text-3xl font-bold">{v as number}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">{humanize(k)}</div>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>Upcoming dates</h2>
          {d.upcoming.length === 0 && <p className="text-sm text-slate-400">No follow-ups or deadlines scheduled.</p>}
          {d.upcoming.map((u: any, i: number) => (
            <Link key={i} to={`/applications/${u.application_id}`} className="flex items-center justify-between py-1.5 border-b border-slate-100 text-sm hover:underline">
              <span className="truncate">{u.company} <span className="text-slate-400">· {u.position}</span></span>
              <span className="shrink-0 ml-2"><span className="text-xs text-slate-400">{u.type}</span> <span className="font-medium">{u.date}</span></span>
            </Link>
          ))}
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>Recent activity</h2>
          {d.recent_activity.length === 0 && <p className="text-sm text-slate-400">No activity logged yet.</p>}
          {d.recent_activity.map((x: any, i: number) => (
            <Link key={i} to={`/applications/${x.application_id}`} className="block py-1.5 border-b border-slate-100 text-sm hover:underline">
              <span className="text-xs text-slate-400">{new Date(x.date).toLocaleDateString()} · {humanize(x.activity_type)} · {x.company}</span>
              <div>{x.title}</div>
            </Link>
          ))}
        </Card>
      </div>

      <div className="mt-6"><Link to="/applications" className="text-sm" style={{ color: 'var(--color-accent)' }}>Manage all applications →</Link></div>
    </div>
  )
}
