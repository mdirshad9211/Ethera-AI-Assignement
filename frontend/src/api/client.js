const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function api(path, options = {}) {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  const token = localStorage.getItem('token')
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    let body = {}
    try {
      body = await res.json()
    } catch {
      /* ignore */
    }
    const msg = body?.error?.message || res.statusText || 'Request failed'
    throw new ApiError(msg, res.status, body?.error?.details)
  }

  if (res.status === 204) return null
  return res.json()
}
