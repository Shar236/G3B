import { useCallback, useEffect, useState } from 'react'
import api, { parseApiError } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'

// A short-lived cache prevents repeated requests when returning to an inbox.
// Mutations explicitly invalidate the resource; cancelled/stale responses never commit.
const cache = new Map()
const TTL = 15000

export function invalidateAdminCollection(path) {
  for (const key of cache.keys()) if (key.startsWith(`${path}?`)) cache.delete(key)
}

export function useDebouncedValue(value, delay = 250) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}

export default function useAdminCollection(path, filters) {
  const { user } = useAuth()
  const userKey = `${user?.id || 'anonymous'}:${user?.role || ''}`
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [revision, setRevision] = useState(0)
  const query = JSON.stringify(filters)
  const reload = useCallback(() => {
    invalidateAdminCollection(path)
    setRevision((value) => value + 1)
  }, [path])

  useEffect(() => {
    const controller = new AbortController()
    const key = `${path}?${userKey}:${query}`
    const existing = cache.get(key)
    setError(null)
    if (existing && Date.now() - existing.at < TTL) {
      setItems(existing.data.data)
      setPagination(existing.data.pagination)
      setLoading(false)
      return () => controller.abort()
    }
    setLoading(true)
    api.get(path, { params: JSON.parse(query), signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        cache.set(key, { at: Date.now(), data })
        if (cache.size > 60) cache.delete(cache.keys().next().value)
        setItems(data.data)
        setPagination(data.pagination)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(parseApiError(cause))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [path, query, revision, userKey])

  return { items, setItems, pagination, loading, error, reload }
}
