export interface AuthSession { user: { email: string }; token: string }

const API_URL = import.meta.env.VITE_AUTH_API_URL?.replace(/\/$/, '')
const SESSION_KEY = 'paper-fu-auth-session'

const request = async <T>(path: string, body?: unknown): Promise<T> => {
  if (!API_URL) throw new Error('Authentication service is not configured. Set VITE_AUTH_API_URL to a real server-side auth endpoint.')
  const response = await fetch(`${API_URL}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: body ? JSON.stringify(body) : undefined })
  if (!response.ok) throw new Error((await response.text()) || 'Authentication request failed.')
  return response.json() as Promise<T>
}

export const auth = {
  async login(email: string, password: string) {
    const session = await request<AuthSession>('/auth/login', { email, password })
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  },
  async session() {
    const cached = sessionStorage.getItem(SESSION_KEY)
    if (!cached) return null
    try { return JSON.parse(cached) as AuthSession } catch { return null }
  },
  async logout() {
    try { if (API_URL) await request('/auth/logout', {}) } finally { sessionStorage.removeItem(SESSION_KEY) }
  },
  async changePassword(currentPassword: string, newPassword: string) {
    await request('/auth/change-password', { currentPassword, newPassword })
  },
  configured: Boolean(API_URL),
}
