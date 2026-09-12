import type { AuthResponse, UserResult } from './types'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')
export const WS_URL = (import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, 'ws')).replace(/\/$/, '')

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(payload.message || `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  register: (username: string, password: string) => request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) => request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: (token: string) => request<{ username: string }>('/api/auth/me', {}, token),
  wsTicket: (token: string) => request<{ ticket: string }>('/api/auth/ws-ticket', { method: 'POST' }, token),
  searchUsers: (token: string, q: string) => request<UserResult[]>(`/api/users/search?q=${encodeURIComponent(q)}`, {}, token),
  uploadImage: async (token: string, recipient: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_URL}/api/media/upload?recipient=${encodeURIComponent(recipient)}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, cache: 'no-store'
    })
    if (!res.ok) {
      const payload = await res.json().catch(() => ({})) as { message?: string }
      throw new Error(payload.message || 'Image upload failed')
    }
    return res.json() as Promise<{ mediaId: string }>
  },
  consumeImage: async (token: string, mediaId: string) => {
    const res = await fetch(`${API_URL}/api/media/${mediaId}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (!res.ok) {
      const payload = await res.json().catch(() => ({})) as { message?: string }
      throw new Error(payload.message || 'This image is no longer available')
    }
    return res.blob()
  },
  revokeImage: (token: string, mediaId: string) => request<void>(`/api/media/${mediaId}`, { method: 'DELETE' }, token)
}
