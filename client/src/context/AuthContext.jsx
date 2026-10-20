import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login as loginRequest, logout as logoutRequest } from '../api/adminApi.js'
import api, { clearApiSession, onAuthExpired, onAuthRefreshed, parseApiError } from '../api/client.js'
import { notify } from '../api/notifications.js'
import { ADMIN_BASE, adminPath } from '../config/adminRoute.js'

const AuthContext = createContext(null)
let pendingSession = null

// Share the initial check across StrictMode remounts. Access and refresh tokens
// stay in HttpOnly cookies; only the CSRF token is held in browser memory.
function fetchSession() {
  if (!pendingSession) {
    pendingSession = api.get('/api/auth/me', { notifyOnError: false })
      .then(async (response) => {
        const data = response.data.data
        // /me also restores the CSRF token for a separate API origin, where
        // the frontend cannot read that origin's cookie after a page reload.
        if (data.user || !data.csrfToken) return data
        const session = await api.get('/api/auth/session', { notifyOnError: false })
        return session.data.data
      })
      .finally(() => { pendingSession = null })
  }
  return pendingSession
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const operation = useRef(0)
  const navigate = useNavigate()
  const location = useLocation()

  const refresh = useCallback(async () => {
    const currentOperation = ++operation.current
    setLoading(true)
    try {
      const data = await fetchSession()
      if (currentOperation === operation.current) {
        setUser(data.user ?? null)
        setError(null)
      }
      return data.user ?? null
    } catch (err) {
      if (currentOperation === operation.current) {
        const parsed = parseApiError(err)
        setUser(null)
        setError(parsed.status === 401 ? null : parsed.message)
      }
      return null
    } finally {
      if (currentOperation === operation.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    return () => { operation.current += 1 }
  }, [refresh])

  useEffect(() => {
    const stopExpiry = onAuthExpired(() => {
      operation.current += 1
      setUser(null)
      setLoading(false)
      const protectedPath = location.pathname === ADMIN_BASE || location.pathname.startsWith(`${ADMIN_BASE}/`)
      const authPage = ['login', 'forgot-password', 'reset-password'].some((page) => location.pathname === adminPath(page))
      if (user || (protectedPath && !authPage)) {
        const message = 'Your session has expired. Please sign in again.'
        setError(message)
        notify({ type: 'info', message })
        if (protectedPath && !authPage) {
          navigate(adminPath('login'), { replace: true, state: { from: location.pathname } })
        }
      }
    })
    const stopRefresh = onAuthRefreshed((refreshedUser) => {
      if (refreshedUser) {
        setUser(refreshedUser)
        setError(null)
      }
    })
    return () => { stopExpiry(); stopRefresh() }
  }, [location.pathname, navigate, user])

  const login = useCallback(async (credentials) => {
    const currentOperation = ++operation.current
    const data = await loginRequest(credentials)
    if (currentOperation === operation.current) {
      setUser(data.user)
      setError(null)
      setLoading(false)
    }
    return data.user
  }, [])

  const logout = useCallback(async () => {
    const currentOperation = ++operation.current
    try {
      await logoutRequest()
    } finally {
      clearApiSession()
      if (currentOperation === operation.current) {
        setUser(null)
        setError(null)
        setLoading(false)
      }
    }
  }, [])

  const hasRole = useCallback((...roles) => Boolean(user && roles.includes(user.role)), [user])

  const value = useMemo(
    () => ({ user, loading, sessionReady: !loading, error, login, logout, refresh, hasRole, isAuthenticated: Boolean(user) }),
    [user, loading, error, login, logout, refresh, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}

export default AuthContext
