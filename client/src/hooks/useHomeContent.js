import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { fetchHome } from '../api/contentApi.js'
import { onContentChanged, parseApiError } from '../api/client.js'
import { createResourceCache } from '../api/resourceCache.js'

const homeCache = createResourceCache((options) => fetchHome({ ...options, notifyOnError: false }), { parseError: parseApiError })
onContentChanged(() => homeCache.invalidate())
export const invalidateHomeContent = () => homeCache.invalidate()

/**
 * Load the aggregated homepage payload. Returns loading / error state and a
 * `reload` function so the UI can offer a retry button.
 */
export function useHomeContent() {
  const state = useSyncExternalStore(homeCache.subscribe, homeCache.getSnapshot, homeCache.getSnapshot)
  const reload = useCallback(() => homeCache.load({ force: true }), [])

  useEffect(() => {
    homeCache.load()
  }, [])

  return { data: state.data, loading: state.loading, error: state.error, reload }
}

export default useHomeContent
