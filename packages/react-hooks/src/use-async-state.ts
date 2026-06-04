import { useState, useCallback } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Generic async state management hook.
 *
 * Eliminates repetitive try/catch/setState patterns for API calls.
 */
export function useAsyncState<TData, TParams extends unknown[] = []>(
  fetcher: (...params: TParams) => Promise<TData | null>,
  initialData: TData | null = null
) {
  const [state, setState] = useState<AsyncState<TData>>({
    data: initialData,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (...params: TParams): Promise<TData | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const result = await fetcher(...params)
      setState(prev => ({ ...prev, data: result, loading: false }))
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operation failed'
      setState(prev => ({ ...prev, error: message, loading: false }))
      return null
    }
  }, [fetcher])

  const setData = useCallback((updater: TData | ((prev: TData | null) => TData | null)) => {
    setState(prev => ({
      ...prev,
      data: typeof updater === 'function'
        ? (updater as (prev: TData | null) => TData | null)(prev.data)
        : updater,
    }))
  }, [])

  return { ...state, execute, setData }
}
