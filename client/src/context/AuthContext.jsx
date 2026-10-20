import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchMe, login as loginRequest, logout as logoutRequest } from '../api/adminApi.js'
import { parseApiError } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchMe()
      setUser(data.user ?? null)
      setError(null)
      return data.user ?? null
    } catch (err) {
      setUser(null)
      setError(parseApiError(err).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials)
    setUser(data.user)
    setError(null)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, error, login, logout, refresh, isAuthenticated: Boolean(user) }),
    [user, loading, error, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}

export default AuthContext
