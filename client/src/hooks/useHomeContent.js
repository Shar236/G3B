import { useCallback, useEffect, useState } from 'react'
import { fetchHome } from '../api/contentApi.js'
import { parseApiError } from '../api/client.js'

/**
 * Load the aggregated homepage payload. Returns loading / error state and a
 * `reload` function so the UI can offer a retry button.
 */
export function useHomeContent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await fetchHome()
      setData(payload)
      return payload
    } catch (err) {
      setError(parseApiError(err))
      setData(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}

export default useHomeContent
