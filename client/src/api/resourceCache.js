/** A single-resource cache with shared requests, stale invalidation and aborts. */
export function createResourceCache(fetcher, { staleTime = 60000, parseError = (error) => error } = {}) {
  const listeners = new Set()
  let state = { data: null, loading: true, error: null, updatedAt: 0 }
  let pending = null
  let controller = null
  let generation = 0

  function publish(patch) {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }

  function load({ force = false } = {}) {
    if (pending) return pending
    if (!force && state.data !== null && Date.now() - state.updatedAt < staleTime) return Promise.resolve(state.data)
    const requestGeneration = generation
    controller = new AbortController()
    publish({ loading: state.data === null, error: null })
    pending = Promise.resolve().then(() => fetcher({ signal: controller.signal }))
      .then((data) => {
        if (requestGeneration === generation) publish({ data, loading: false, error: null, updatedAt: Date.now() })
        return data
      }).catch((error) => {
        if (requestGeneration === generation && error?.code !== 'ERR_CANCELED' && error?.name !== 'AbortError') {
          publish({ loading: false, error: parseError(error) })
        }
        return null
      }).finally(() => {
        pending = null
        controller = null
        if (requestGeneration !== generation && listeners.size > 0) load({ force: true })
      })
    return pending
  }

  function invalidate() {
    generation += 1
    controller?.abort()
    publish({ updatedAt: 0 })
    if (listeners.size > 0 && !pending) load({ force: true })
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    load,
    invalidate,
  }
}
