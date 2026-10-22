import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import studentApi, { getStudentSession } from '../api/studentApi.js'
import { parseApiError } from '../api/client.js'

const StudentContext = createContext(null)

export function StudentProvider({ children }) {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const version = useRef(0)
  const refresh = useCallback(async () => {
    const current = ++version.current
    setLoading(true)
    try {
      const data = await getStudentSession()
      if (current === version.current) { setStudent(data.student); setError(null) }
    } catch (err) {
      if (current === version.current) setError(parseApiError(err).message)
    } finally { if (current === version.current) setLoading(false) }
  }, [])
  useEffect(() => { refresh(); return () => { version.current += 1 } }, [refresh])

  const authenticate = useCallback(async (mode, values) => {
    const current = ++version.current
    const response = await studentApi.post(`/api/student/${mode}`, values)
    if (current === version.current) { setStudent(response.data.data.student); setError(null); setLoading(false) }
    return response.data.data.student
  }, [])
  const logout = useCallback(async () => {
    try { await studentApi.post('/api/student/logout') }
    catch (err) { if (parseApiError(err).status !== 401) throw err }
    version.current += 1
    setStudent(null)
    setError(null)
  }, [])
  const invalidate = useCallback(() => { version.current += 1; setStudent(null); setLoading(false); setError(null) }, [])
  const value = useMemo(() => ({ student, loading, error, refresh, authenticate, logout, invalidate }), [student, loading, error, refresh, authenticate, logout, invalidate])
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}

export function useStudent() { return useContext(StudentContext) }
