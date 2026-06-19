const TOKEN_KEY = 'folio_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(status: number, message: string, data: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function api(path: string, opts: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json'

  const r = await fetch('/api' + path, { ...opts, headers })
  if (r.status === 204) return null
  const data = await r.json().catch(() => null)
  if (!r.ok) {
    if (r.status === 401) setToken(null)
    throw new ApiError(r.status, (data && (data.detail || data.message)) || 'Request failed', data)
  }
  return data
}

export const apiGet = (p: string) => api(p)
export const apiPost = (p: string, body?: unknown) =>
  api(p, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined })
export const apiPatch = (p: string, body: unknown) =>
  api(p, { method: 'PATCH', body: JSON.stringify(body) })
export const apiDelete = (p: string) => api(p, { method: 'DELETE' })
export const apiUpload = (p: string, form: FormData) =>
  api(p, { method: 'POST', body: form })
