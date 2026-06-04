import { useState, useCallback } from 'react'

interface FetchState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

/**
 * Unified API fetch hook.
 *
 * - Handles both `{ code: 200, data }` and `{ success: true, data }` response formats
 * - Manages loading / error state automatically
 * - Sends `credentials: 'include'` by default
 */
export function useApiFetch<T = unknown>() {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    loading: false,
  })

  const fetchApi = useCallback(
    async (url: string, options?: RequestInit): Promise<T | null> => {
      setState({ data: null, error: null, loading: true })
      try {
        const res = await fetch(url, { credentials: 'include', ...options })
        const json = await res.json()

        const success =
          json.success ?? (json.code >= 200 && json.code < 300)
        if (!success || !res.ok) {
          throw new Error(
            json.error || json.message || `Request failed (${res.status})`
          )
        }

        const result = (json.data ?? json) as T
        setState({ data: result, error: null, loading: false })
        return result
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setState({ data: null, error: msg, loading: false })
        return null
      }
    },
    []
  )

  return { ...state, fetchApi }
}
