import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export function Button({ variant = 'primary', className = '', ...p }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' | 'danger' }) {
  const base = 'px-3 py-1.5 text-sm rounded font-medium disabled:opacity-50 inline-flex items-center gap-1.5'
  const styles: Record<string, string> = {
    primary: 'text-white',
    outline: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const style = variant === 'primary' ? { background: 'var(--color-accent)' } : undefined
  return <button className={`${base} ${styles[variant]} ${className}`} style={style} {...p} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}>{children}</div>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

export const input = 'w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-500'

export function Spinner({ label }: { label?: string }) {
  return <span className="inline-flex items-center gap-2 text-slate-500 text-sm">
    <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />{label}</span>
}

// --- Toast -----------------------------------------------------------------
type Toast = { id: number; msg: string; kind: 'success' | 'error' }
const ToastCtx = createContext<(msg: string, kind?: 'success' | 'error') => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((msg: string, kind: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.floor(performance.now())
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 no-print">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-2.5 rounded text-sm text-white shadow-lg ${t.kind === 'error' ? 'bg-red-700' : 'bg-slate-800'}`}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function confirmAction(message: string): boolean {
  return window.confirm(message)
}
